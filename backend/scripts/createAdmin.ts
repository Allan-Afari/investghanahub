import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'mrdjcashkid@gmail.com';
    const password = 'Djallan480';
    const firstName = 'Admin';
    const lastName = 'User';
    const phone = '+233200000000';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('Admin account already exists. Updating role to ADMIN...');
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
      });
      console.log('Admin role updated successfully');
      return;
    }

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'ADMIN',
        emailVerified: true,
      },
    });

    console.log('Admin account created successfully:', admin.email);
    console.log('Login credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
