import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async singup(email: string, password: string) {
    //see if email is in user
    const user = await this.usersService.find(email);
    if (user.length) {
      throw new BadRequestException('email already exists');
    }
    //Hash the users password
    // Generate a salt
    const salt = randomBytes(8).toString('hex');

    // Hash the salt and password together
    const hash = (await scrypt(password, salt, 32)) as Buffer;

    // join the hashed result and salt together
    const result = salt + '.' + hash.toString('hex');

    //Create  a new user and save it
    const newUser = await this.usersService.create(email, result);

    //return the user
    return newUser;
  }

  async signin(email: string, password: string) {
    //Get the stored user detail from db
    const [user] = await this.usersService.find(email);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    //split the stored hash and salt
    const [salt, storedHash] = user.password.split('.');

    //hash the supplied password
    const hash = (await scrypt(password, salt, 32)) as Buffer;

    //compare the password hash
    if (storedHash !== hash.toString('hex')) {
      throw new BadRequestException('wrong password');
    }

    return user;
  }
}
