import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Text } from '@/components/text';
import { z } from 'zod';

import { Divider, GoogleButton } from '@/components/google-button';
import { Button, TextField } from '@/components/ui';
import { errorMessage } from '@/lib/format';
import { useAuth } from '@/stores/auth';

const schema = z
  .object({
    firstName: z.string().trim().min(1, 'Enter your first name'),
    middleName: z.string().trim().optional(),
    lastName: z.string().trim().min(1, 'Enter your last name'),
    email: z.email('Enter a valid email'),
    password: z.string().min(6, 'At least 6 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type Form = z.infer<typeof schema>;

export default function RegisterScreen() {
  const register = useAuth((s) => s.register);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', middleName: '', lastName: '', email: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ firstName, middleName, lastName, email, password }) => {
    setError(null);
    try {
      await register({ firstName, middleName, lastName }, email, password);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <ScrollView contentContainerClassName="gap-4 p-6" keyboardShouldPersistTaps="handled">
        <View className="gap-1.5">
          <Text className="font-display-bold text-[24px] tracking-tight text-fg">Create your account</Text>
          <Text className="text-sm text-muted">You will be the owner of this tank.</Text>
        </View>
        <View className="flex-row gap-2">
          <Controller
            control={control}
            name="firstName"
            render={({ field, fieldState }) => (
              <TextField
                className="flex-1"
                label="First name"
                icon={UserRound}
                placeholder="Juan"
                autoComplete="given-name"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field, fieldState }) => (
              <TextField
                className="flex-1"
                label="Last name"
                placeholder="Dela Cruz"
                autoComplete="family-name"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
        <Controller
          control={control}
          name="middleName"
          render={({ field, fieldState }) => (
            <TextField
              label="Middle name"
              placeholder="Optional"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              label="Email"
              icon={Mail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              label="Password"
              icon={Lock}
              placeholder="At least 6 characters"
              secureTextEntry
              autoComplete="new-password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirm"
          render={({ field, fieldState }) => (
            <TextField
              label="Confirm password"
              icon={Lock}
              placeholder="Type it again"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={() => onSubmit()}
              error={fieldState.error?.message}
            />
          )}
        />
        {error ? <Text className="text-sm text-crit">{error}</Text> : null}
        <Button title="Create account" loading={formState.isSubmitting} onPress={() => onSubmit()} />
        <Divider label="or" />
        <GoogleButton />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
