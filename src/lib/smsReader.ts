import { PermissionsAndroid, Platform } from 'react-native';

import SmsReaderModule from '../../modules/sms-reader';
import type { PhoneSms } from '../../modules/sms-reader/src/SmsReader.types';

export type { PhoneSms };

/**
 * Lit les SMS Mobile Money de la boîte de réception (Android uniquement).
 * Nécessite une version installée de l'application : Expo Go n'inclut pas ce module natif.
 */
export async function readMoneySms(limit = 100): Promise<PhoneSms[]> {
  if (Platform.OS !== 'android') {
    throw new Error('La lecture des SMS n’est disponible que sur Android.');
  }

  const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: 'Lire les SMS Mobile Money',
    message:
      'MonBudget a besoin d’accéder à tes SMS pour importer automatiquement tes entrées et sorties d’argent.',
    buttonNeutral: 'Plus tard',
    buttonNegative: 'Refuser',
    buttonPositive: 'Autoriser',
  });
  if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Permission de lecture des SMS refusée.');
  }

  return SmsReaderModule.getMoneySmsAsync(limit);
}
