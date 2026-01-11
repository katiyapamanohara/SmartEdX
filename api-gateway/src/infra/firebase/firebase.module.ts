import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_APP',
      useFactory: (configService: ConfigService) => {
        const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY');

        // Only initialize Firebase if credentials are provided
        if (!projectId || !clientEmail || !privateKey) {
          console.warn(
            '⚠️  Firebase credentials not configured. Firebase authentication will not be available.',
          );
          console.warn(`Debug: ProjectID: ${!!projectId}, Email: ${!!clientEmail}, Key: ${!!privateKey}`);
          return null;
        }

        const firebaseConfig = {
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        };

        // Only initialize if not already initialized
        if (!admin.apps.length) {
          return admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
          });
        }
        return admin.app();
      },
      inject: [ConfigService],
    },
  ],
  exports: ['FIREBASE_APP'],
})
export class FirebaseModule {}
