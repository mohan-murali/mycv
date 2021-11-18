import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUsersService: Partial<UsersService>;

  beforeEach(async () => {
    // Create a fake copy of the users service
    const users: User[] = [];
    fakeUsersService = {
      find: (email: string) =>
        Promise.resolve(users.filter((user) => user.email === email)),
      create: (email: string, password: string) => {
        const user = {
          id: Math.floor(Math.random() * 99999),
          email,
          password,
        } as User;
        users.push(user);
        return Promise.resolve(user);
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUsersService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('can create an instace of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('creates a new user with a salted and hashed password', async () => {
    const user = await service.singup('asdf@asdf.com', 'asdf');
    expect(user.password).not.toEqual('asdc');
    expect(user.password).toContain('.');
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws an error if user signs up with email in use', async () => {
    await service.singup('asdf@asdf.com', 'asdf');
    try {
      await service.singup('asdf@asdf.com', 'asdf');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe('email already exists');
    }
  });

  it('throws if siggin is called with unused email', async () => {
    try {
      await service.signin('asdfasfda@adsfa.com', 'pasdfwoe');
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.message).toBe('user not found');
    }
  });

  it('throws if an invalid password is provided', async () => {
    await service.singup('asdfasfda@adsfa.com', 'adsfaweads');
    try {
      await service.signin('asdfasfda@adsfa.com', 'pasdfwoe');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe('wrong password');
    }
  });

  it('returns a user if correct password is provided', async () => {
    await service.singup('asdf@adf.com', 'asdfasd');
    const user = await service.signin('asdf@adf.com', 'asdfasd');
    expect(user).toBeDefined();
  });
});
