# تثبيت الاعتماديات
npm install

# إنشاء قاعدة البيانات
npx prisma migrate dev --name init

# تشغيل الـ Seed
npm run prisma:seed

# تشغيل التطبيق
npm run dev