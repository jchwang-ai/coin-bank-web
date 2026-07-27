import { NextResponse } from 'next/server';
import { initializeDatabase, seedDatabase } from '@/lib/db';

export async function POST() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('✓ Tables created');

    await seedDatabase();
    console.log('✓ Database seeded with initial data');

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
