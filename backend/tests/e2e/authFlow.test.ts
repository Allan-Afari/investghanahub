import { test, expect } from '@playwright/test';

test.describe('Authentication Flow E2E Tests', () => {
  test('should complete full user registration and login flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto('http://localhost:5173/register');

    // Fill registration form
    await page.fill('input[name="email"]', 'e2e-test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="firstName"]', 'E2E');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="phoneNumber"]', '+1234567890');

    // Select role
    await page.selectOption('select[name="role"]', 'INVESTOR');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to login or dashboard
    await page.waitForURL('**/login');

    // Now test login
    await page.fill('input[name="email"]', 'e2e-test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('**/investor');

    // Verify we're logged in
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Try to login with wrong credentials
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('http://localhost:5173/investor');

    // Should redirect to login
    await page.waitForURL('**/login');
  });
});
