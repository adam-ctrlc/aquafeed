import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Eye, EyeOff, Fish, FlaskConical, Info, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Divider, GoogleButton } from '@/components/google-button';
import { AppearanceButton } from '@/components/appearance';
import { BottomSheet } from '@/components/sheet';
import { Button, Icon, TextField } from '@/components/ui';
import { isDemo } from '@/lib/db';
import { modeLabel, showModeInfo } from '@/lib/mode';
import { DEMO_ACCOUNTS } from '@/lib/demo';
import { errorMessage } from '@/lib/format';
import { useAuth } from '@/stores/auth';

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type Form = z.infer<typeof schema>;

export default function LoginScreen() {
  const signIn = useAuth((s) => s.signIn);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const { control, handleSubmit, formState, setValue, getValues } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="flex-grow justify-center gap-5 px-5 py-8"
          keyboardShouldPersistTaps="handled">
          <View className="flex-row justify-end">
            <AppearanceButton />
          </View>
          <View className="items-center gap-3">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-accentsoft">
              <Icon as={Fish} tone="accent" size={30} />
            </View>
            <View className="items-center gap-1.5">
              <Text className="font-display-bold text-[26px] tracking-tight text-fg">Welcome to AquaFeed</Text>
              <Text className="text-center text-sm text-muted">Sign in to check on your tank and feed your fish.</Text>
            </View>
            <Pressable
              onPress={showModeInfo}
              className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 active:opacity-80">
              <Icon as={Info} tone="accent" size={13} />
              <Text className="text-xs font-semibold text-accent">{modeLabel}</Text>
            </Pressable>
          </View>

          <View className="gap-3 rounded-2xl bg-surface p-4">
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
                  placeholder="Your password"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  onSubmitEditing={() => onSubmit()}
                  error={fieldState.error?.message}
                  right={
                    <Pressable
                      hitSlop={8}
                      onPress={() => setShowPassword((v) => !v)}
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                      <Icon as={showPassword ? EyeOff : Eye} tone="muted" size={16} />
                    </Pressable>
                  }
                />
              )}
            />
            <Pressable className="self-end" hitSlop={6} onPress={() => setResetOpen(true)}>
              <Text className="text-xs font-medium text-accent">Forgot password?</Text>
            </Pressable>
            {error ? <Text className="text-sm text-crit">{error}</Text> : null}
            <Button title="Sign in" loading={formState.isSubmitting} onPress={() => onSubmit()} />
            <Divider label="or" />
            <GoogleButton />
            {isDemo ? (
              <Button
                title="Try a demo account"
                variant="ghost"
                icon={<Icon as={FlaskConical} tone="accent" />}
                onPress={() => setDemoOpen(true)}
              />
            ) : null}
          </View>

          <View className="flex-row justify-center gap-1">
            <Text className="text-sm text-muted">No account yet?</Text>
            <Link href="/register" asChild>
              <Pressable>
                <Text className="text-sm font-semibold text-accent">Create one</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={demoOpen} onClose={() => setDemoOpen(false)} title="Demo accounts">
        <Text className="mb-3 text-sm leading-5 text-fg2">
          Pick one to fill in the sign-in form. Both show sample data, so nothing you do is saved.
        </Text>
        <View className="gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <Pressable
              key={a.email}
              onPress={() => {
                setValue('email', a.email);
                setValue('password', a.password);
                setDemoOpen(false);
              }}
              className="flex-row items-center gap-3 rounded-xl bg-surface2 px-3.5 py-3 active:opacity-70">
              <Icon as={a.role === 'admin' ? ShieldCheck : UserRound} tone="accent" size={18} />
              <View className="flex-1 gap-0.5">
                <Text className="text-[13px] font-medium text-fg">{a.email}</Text>
                <Text className="text-[11px] text-muted">
                  {a.role === 'admin' ? 'Administrator, can change limits and calibration' : 'Owner, everyday use'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet visible={resetOpen} onClose={() => setResetOpen(false)} title="Reset your password">
        {resetOpen ? <ResetForm initialEmail={getValues('email')} onDone={() => setResetOpen(false)} /> : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

function ResetForm({ initialEmail, onDone }: { initialEmail: string; onDone: () => void }) {
  const resetPassword = useAuth((s) => s.resetPassword);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <View className="gap-3">
        <Text className="text-sm leading-5 text-fg2">
          If there is an account for {email.trim()}, a link to set a new password is on its way. Check your inbox and spam folder.
        </Text>
        <Button title="Done" onPress={onDone} />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text className="text-sm leading-5 text-fg2">
        Enter the email you signed up with and we will send you a link to set a new password.
      </Text>
      <TextField
        label="Email"
        icon={Mail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        error={error ?? undefined}
      />
      <View className="mt-1 flex-row gap-2">
        <Button className="flex-1" title="Cancel" variant="secondary" onPress={onDone} />
        <Button
          className="flex-[2]"
          title="Send reset link"
          loading={busy}
          disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await resetPassword(email);
              setSent(true);
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </View>
    </View>
  );
}
