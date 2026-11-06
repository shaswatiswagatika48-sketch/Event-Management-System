# Event Management System - Backend

This backend is written in a simple, beginner-friendly way so it is easier to understand during a college project demo.

## Main idea

- Every new account starts with `role: "user"`.
- A user can create an event after logging in.
- The person who creates an event is stored in `event.createdBy` and is treated as the admin/owner of that event.
- A person who registers for an event stays a normal `user`.
- Every event has an INR ticket price set by its creator.
- Event registration requires email OTP verification and payment confirmation using the PhonePe QR.
- PhonePe QR confirmation is attendee-reported; the static QR cannot automatically verify payment.
- Event registration may include an optional restaurant and menu items; menu prices are recalculated by the backend and included in the reported payment total and confirmation email.
- Platform admins can open **Food Pictures** in the frontend to upload a separate JPG, PNG, or WebP image (up to 5 MB) for each restaurant food item. Images are stored under `uploads/food` and served from `/uploads`.
- OTP is sent by email only. Twilio/SMS is not used.
- Razorpay is used for online payment when its keys are added.

## Run

```bash
npm install
npm start
```

Server:
`http://localhost:5000`

## Add sample restaurants and events

After confirming `.env` points to the Atlas database you want to use and creating
at least one EventHub account, run this from the backend folder:

```bash
npm run seed:demo
```

The repeatable command creates sample restaurants, tables, food, beverages, and
three future events using the first existing user as their creator. Sample
records are prefixed with `EventHub Sample:`; Tech Fest events are not created.
It does not delete or overwrite existing events. Do not run it against a
production database unless you want these sample records there.

## Email OTP

Copy `.env.example` to `.env` and add a Gmail App Password.

OTP flow:

1. Login.
2. Call `POST /api/otp/send` with `purpose: "registration"` or `purpose: "event_creation"`.
3. Enter the OTP from email using `POST /api/otp/verify`.
4. Continue with the event action.

## Event creator flow

`POST /api/events` only needs a logged-in user. The backend automatically saves that user's ID in `createdBy`.

Example event data:

```json
{
  "title": "College Fest 2026",
  "description": "Annual college event",
  "date": "2026-11-20",
  "time": "10:00 AM",
  "location": "College Auditorium",
  "totalSeats": 200,
  "ticketPrice": 500,
  "rules": ["Carry college ID", "No outside food"]
}
```

For event registration, the attendee scans the PhonePe QR, then confirms payment on the site. The registration confirmation email is sent after that confirmation. Because the QR is static, EventHub does not verify that money was received; use a payment gateway/webhook for automatic payment verification.

## Important

Do not put `.env` or `node_modules` on GitHub.
