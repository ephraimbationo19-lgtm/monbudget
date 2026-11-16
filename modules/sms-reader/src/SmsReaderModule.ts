import { NativeModule, requireNativeModule } from 'expo';

import type { PhoneSms } from './SmsReader.types';

declare class SmsReaderModule extends NativeModule<Record<string, never>> {
  getMoneySmsAsync(limit: number): Promise<PhoneSms[]>;
}

export default requireNativeModule<SmsReaderModule>('SmsReader');
