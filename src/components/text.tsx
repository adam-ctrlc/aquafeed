import { Text as RNText, type TextProps } from 'react-native';

const WEIGHT = /\bfont-(normal|medium|semibold|bold|display|display-bold)\b/;

/** React Native Text with Inter Regular as the default; font-* classes pick other weights or the display face. */
export function Text({ className, ...props }: TextProps & { className?: string }) {
  return (
    <RNText className={className && WEIGHT.test(className) ? className : `font-normal ${className ?? ''}`} {...props} />
  );
}
