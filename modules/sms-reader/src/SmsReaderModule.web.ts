import { registerWebModule, NativeModule } from 'expo';

class SmsReaderModule extends NativeModule<Record<string, never>> {
  async getMoneySmsAsync(): Promise<[]> {
    return [];
  }
}

export default registerWebModule(SmsReaderModule, 'SmsReader');
