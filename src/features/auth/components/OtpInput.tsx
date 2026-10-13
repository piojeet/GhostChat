import { adaptThemeClassName, adaptThemeColor } from '../../../theme/systemTheme';
import React, { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
};

const OtpInput = ({ value, onChange, length = 6 }: OtpInputProps) => {
  const inputRef = useRef<any>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  const focusInput = (nextIndex?: number) => {
    if (typeof nextIndex === 'number') {
      setFocusedIndex(nextIndex);
    } else {
      setFocusedIndex(Math.min(value.length, length - 1));
    }

    inputRef.current?.focus?.();
  };

  const handleChange = (text: string) => {
    const nextValue = text.replace(/\D/g, '').slice(0, length);
    onChange(nextValue);
    setFocusedIndex(Math.min(nextValue.length, length - 1));
  };

  const handleBackspace = () => {
    if (value.length > 0) {
      const nextValue = value.slice(0, -1);
      onChange(nextValue);
      setFocusedIndex(Math.max(nextValue.length - 1, 0));
    }
  };

  return (
    <View className="flex-row items-center justify-between">
      {digits.map((digit, index) => {
        const isFocused = focusedIndex === index;

        return (
          <Pressable
            key={index}
            accessibilityRole="button"
            onPress={() => focusInput(index)}
            className="h-[45px] w-[42px] items-center justify-center rounded-[4px] border"
            style={{
              borderColor: isFocused ? '#FFEA00' : adaptThemeColor('#444444', 'borderColor'),
              backgroundColor: adaptThemeColor('#191919', 'backgroundColor'),
            }}
          >
            <Text
              className={adaptThemeClassName('text-[24px] font-bold text-white')}
              style={{ fontFamily: 'Inter' }}
            >
              {digit}
            </Text>
          </Pressable>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => focusInput()}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace') {
            handleBackspace();
          }
        }}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        caretHidden
        contextMenuHidden
        selectTextOnFocus
        textAlign="center"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />
    </View>
  );
};

export default OtpInput;
