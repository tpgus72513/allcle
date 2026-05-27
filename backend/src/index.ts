import app from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 allcle backend ready on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
