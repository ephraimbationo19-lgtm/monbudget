declare module 'react-native-get-sms-android' {
  interface SmsAndroidModule {
    list(
      filter: string,
      onFail: (error: string) => void,
      onSuccess: (count: number, smsList: string) => void,
    ): void;
  }

  const SmsAndroid: SmsAndroidModule | undefined;
  export default SmsAndroid;
}
