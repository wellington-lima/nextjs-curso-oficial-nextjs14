import { unstable_noStore as noStore } from 'next/cache'
import { Prisma, PrismaClient } from '@prisma/client'
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

const client = new PrismaClient()

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  
  noStore()

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await client.revenue.findMany()
    //await sql<Revenue>`SELECT * FROM revenue`;

    console.log('Data fetch completed after 3 seconds.');

    return data;

  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore()

  try {
    const sql = `SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const data: any = await client.$queryRaw`${Prisma.raw(sql)}`
      
    const latestInvoices = data.map((invoice: any) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore()

  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const sqlInvoiceCountPromise = `SELECT COUNT(*) FROM invoices`;
    const sqlCustomerCountPromise = `SELECT COUNT(*) FROM customers`;
    const sqlInvoiceStatusPromise = `SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;
   
    const invoiceCountPromise = await client.$queryRaw`${Prisma.raw(sqlInvoiceCountPromise)}`;
    const customerCountPromise = await client.$queryRaw`${Prisma.raw(sqlCustomerCountPromise)}`;
    const invoiceStatusPromise = await client.$queryRaw`${Prisma.raw(sqlInvoiceStatusPromise)}`;

    const data: any = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].count ?? '0');
    const numberOfCustomers = Number(data[1].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  noStore()
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  console.log("filtro", query)
  
  try {
    const sqlInvoices = `SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name LIKE '%${query}%' OR
        customers.email LIKE '%${query}%' OR
        invoices.amount LIKE '%${query}%' OR
        invoices.date LIKE '%${query}%' OR
        invoices.status LIKE '%${query}%'
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;
    
    const invoices = await client.$queryRaw`${Prisma.raw(sqlInvoices)}`;
    
    return invoices;

  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore()
  try {
    const sqlCount = `SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE '%${query}%' OR
      customers.email LIKE '%${query}%' OR
      invoices.amount LIKE '%${query}%' OR
      invoices.date LIKE '%${query}%' OR
      invoices.status LIKE '%${query}%'
  `;

  const count: any = await client.$queryRaw`${Prisma.raw(sqlCount)}`;

    const totalPages = Math.ceil(Number(count.count) / ITEMS_PER_PAGE);
    return totalPages;

  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore()
  try {
    const sqlData = `SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const data: any = await client.$queryRaw`${Prisma.raw(sqlData)}`;

    const invoice = data.map((invoice: any) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    console.log(invoice);
    
    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  noStore()
  try {
    const sqlData = `SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const data: any = await client.$queryRaw`${Prisma.raw(sqlData)}`;

    const customers = data;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const sqlData = `SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const data: any = await client.$queryRaw`${Prisma.raw(sqlData)}`;

    const customers = data.rows.map((customer: any) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  try {
    const sqlUser = `SELECT * FROM users WHERE email=${email}`;
    const user: any = await client.$queryRaw`${Prisma.raw(sqlUser)}`;
    return user as User;

  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
