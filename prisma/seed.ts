import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

import { users, customers, invoices, revenue } from '../app/lib/placeholder-data'

const prisma = new PrismaClient()

const load = async () => {
  try {

    // Insert data into the "users" table
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await prisma.users.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: hashedPassword
        }
      })
    }),

    console.log('Users added')

    // Insert data into the "customers" table
    customers.map(async (data) => {
      await prisma.customers.create({
        data: {
          id: data.id,
          name: data.name,
          email: data.email,
          image_url: data.image_url
        }
      })
    }),
    console.log('Customers added')
    
    // Insert data into the "invoices" table
    invoices.map(async (data) => {
      await prisma.invoices.create({
        data: {
          id: data.id,
          customer_id: data.customer_id,
          amount: data.amount,
          status: data.status,
          date: data.date
        }
      })
    }),
    console.log('Invoices added')
    
    // Insert data into the "revenue" table
    revenue.map(async (data) => {
      await prisma.revenue.create({
        data: {
          id: data.id,
          month: data.month,
          revenue: data.revenue
        }
      })
    }),
    console.log('Revenue added')

  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

load()