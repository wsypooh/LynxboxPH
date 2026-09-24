// docs/Payments-and-Subscription-Plan.md — local test entrypoint for the daily
// subscription cron. Not an HTTP route, so the usual 3-file registration rule doesn't
// apply; this bypasses the Lambda/EventBridge event-shape question entirely by calling
// the handler directly. Run with `npm run cron:daily` from api/.
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { SubscriptionCronHandler } from '../handlers/subscriptionCron/handler';

SubscriptionCronHandler.processDaily()
  .then(result => {
    console.log('Done:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('SubscriptionCronHandler.processDaily failed:', err);
    process.exit(1);
  });
