import { PermissionsAndroid, Platform } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';

import { looksLikeMoneySms } from '@/lib/sms';

export interface PhoneSms {
  id: string;
  address: string;
  body: string;
  date: number;
}

/**
 * Lit les SMS de la boîte de réception (Android uniquement).
 * Nécessite une version installée de l'app : Expo Go n'inclut pas ce module natif.
 */
export async function readMoneySms(limit = 100): Promise<PhoneSms[]> {
  if (Platform.OS !== 'android') {
    throw new Error('La lecture des SMS n’est disponible que sur Android.');
  }
  if (!SmsAndroid) {
    throw new Error(
      'Module SMS absent. Installe l’application (version Android) pour activer la lecture automatique. Tu peux aussi copier le message et le coller dans le champ ci-dessous.',
    );
  }

  const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: 'Lire les SMS Mobile Money',
    message: 'MonBudget a besoin d’accéder à tes SMS pour importer automatiquement tes entrées et sorties d’argent.',
    buttonNeutral: 'Plus tard',
    buttonNegative: 'Refuser',
    buttonPositive: 'Autoriser',
  });
  if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Permission de lecture des SMS refusée.');
  }

  const smsModule = SmsAndroid;
  const filter = JSON.stringify({ box: 'inbox', maxCount: limit });
  const messages = await new Promise<PhoneSms[]>((resolve, reject) => {
    smsModule.list(
      filter,
      (error: string) => reject(new Error(error)),
      (_count: number, list: string) => {
        try {
          resolve(JSON.parse(list) as PhoneSms[]);
        } catch (error) {
          reject(error);
        }
      },
    );
  });

  return messages.filter((message) => looksLikeMoneySms(message.body ?? ''));
}
