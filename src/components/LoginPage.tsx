import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { translate, Language } from '@/lib/i18n';
import { Globe, Lock, Mail, Building2 } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: any) => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function LoginPage({ onLogin, lang, setLang }: LoginPageProps) {
  const t = (key: string) => translate(lang, key);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const user = db.getUserByEmail(email);
      if (!user || user.password !== password) {
        setError(t('wrongCredentials'));
        setLoading(false);
        return;
      }

      if (user.status !== 'ACTIVE') {
        setError(t('inactiveAccount'));
        setLoading(false);
        return;
      }

      // Check subscription for restaurant users
      if (user.restaurantId) {
        const days = db.getDaysRemaining(user.restaurantId);
        if (days <= 0) {
          setError(t('expiredSubscription'));
          setLoading(false);
          return;
        }
      }

      onLogin(user);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="bg-white/80 backdrop-blur"
        >
          <Globe className="w-4 h-4 mr-2" />
          {lang === 'en' ? 'العربية' : 'English'}
        </Button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">RestaurantOS</h1>
          <p className="text-slate-500 mt-2">{t('login')}</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-xl text-center">{t('welcomeBack')}</CardTitle>
            <CardDescription className="text-center">
              {t('login')} {t('email')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  {t('rememberMe')}
                </label>
                <button type="button" className="text-sm text-emerald-600 hover:text-emerald-700">
                  {t('forgotPassword')}
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? t('loading') : t('login')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-slate-500">Demo Accounts:</p>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Admin: yuiusf604@gmail.com / Y01012896067y@</p>
            <p>Owner: owner@burgerhouse.com / owner123</p>
            <p>Cashier: cashier@burgerhouse.com / cashier123</p>
            <p>Kitchen: kitchen@burgerhouse.com / kitchen123</p>
          </div>
        </div>
      </div>
    </div>
  );
}