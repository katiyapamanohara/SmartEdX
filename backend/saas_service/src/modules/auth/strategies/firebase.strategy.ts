import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthStrategy extends PassportStrategy(Strategy, 'firebase-auth') {
  constructor(@Inject('FIREBASE_APP') private firebaseApp: admin.app.App) {
    super();
  }

  async validate(req: any): Promise<any> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new UnauthorizedException('No Firebase token provided');
    }

    try {
      const decodedToken = await this.firebaseApp.auth().verifyIdToken(token, true);
      
      if (!decodedToken) {
        throw new UnauthorizedException('Invalid Firebase token');
      }

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
}
