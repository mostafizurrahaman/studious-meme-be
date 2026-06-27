import { describe, it, expect } from 'vitest';
import { UserValidation } from './user.validation';

describe('User Validation - Critical Paths', () => {
  describe('createUserSchema (Signup)', () => {
    it('should validate valid user data', () => {
      const result = UserValidation.createUserSchema.safeParse({
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = UserValidation.createUserSchema.safeParse({
        body: {
          name: 'John Doe',
          email: 'invalid-email',
          password: 'Password123!',
        },
      });

      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = UserValidation.createUserSchema.safeParse({
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          password: '123',
        },
      });

      expect(result.success).toBe(false);
    });

    it('should reject short name', () => {
      const result = UserValidation.createUserSchema.safeParse({
        body: {
          name: 'Jo',
          email: 'john@example.com',
          password: 'Password123!',
        },
      });

      expect(result.success).toBe(false);
    });

    it('should convert email to lowercase', () => {
      const result = UserValidation.createUserSchema.safeParse({
        body: {
          name: 'John Doe',
          email: 'JOHN@EXAMPLE.COM',
          password: 'Password123!',
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.email).toBe('john@example.com');
      }
    });
  });

  describe('signinSchema', () => {
    it('should validate valid signin data', () => {
      const result = UserValidation.signinSchema.safeParse({
        body: {
          email: 'john@example.com',
          password: 'Password123!',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid email in signin', () => {
      const result = UserValidation.signinSchema.safeParse({
        body: {
          email: 'invalid',
          password: 'Password123!',
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate valid password change', () => {
      const result = UserValidation.changePasswordSchema.safeParse({
        body: {
          oldPassword: 'OldPass123!',
          newPassword: 'NewPass123!',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject short new password', () => {
      const result = UserValidation.changePasswordSchema.safeParse({
        body: {
          oldPassword: 'OldPass123!',
          newPassword: '123',
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate valid email', () => {
      const result = UserValidation.forgotPasswordSchema.safeParse({
        body: {
          email: 'john@example.com',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = UserValidation.forgotPasswordSchema.safeParse({
        body: {
          email: 'invalid-email',
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('verifySignupOtpSchema', () => {
    it('should validate valid OTP data', () => {
      const result = UserValidation.verifySignupOtpSchema.safeParse({
        body: {
          userEmail: 'john@example.com',
          otp: '123456',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject OTP longer than 6 digits', () => {
      const result = UserValidation.verifySignupOtpSchema.safeParse({
        body: {
          userEmail: 'john@example.com',
          otp: '1234567',
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileDataSchema', () => {
    it('should validate valid profile data', () => {
      const result = UserValidation.updateProfileDataSchema.safeParse({
        body: {
          name: 'John Doe',
          phone: '01700000000',
          dob: '1990-01-01T00:00:00.000Z',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid phone number', () => {
      const result = UserValidation.updateProfileDataSchema.safeParse({
        body: {
          name: 'John Doe',
          phone: 'abc',
          dob: '1990-01-01T00:00:00.000Z',
        },
      });

      expect(result.success).toBe(false);
    });
  });
});
