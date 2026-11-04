# Restaurant, Table and Payment Flow

1. A logged-in user creates an event.
2. The event stores that user's ID in `createdBy`, so that user is the admin/owner of that event.
3. A normal user can register for the event after email OTP verification.
4. Restaurant, table, food and beverage management stays behind the platform admin routes.
5. Users can select tables, food and beverages for an event.
6. Razorpay can be used for online payment after adding test keys to `.env`.

OTP is email-only. Twilio is not used.

## Restaurant party reservations

- Platform admins configure each restaurant's party status, party description,
  opening and closing times, and table sections from the frontend's
  **Restaurant Setup** page.
- Booking hours must be whole-hour times. An event created with a restaurant
  reserves the entire restaurant for one one-hour slot on its event date,
  even when the organizer selects only some of the restaurant's tables.
  Attendee restaurant/booking flows can reserve the entire restaurant or one
  named section for a one-hour slot.
- Sections are defined by assigning the same section name to the tables that
  make up that area. The whole-restaurant option reserves every section.
  A table's section cannot be changed while an active registration, booking,
  or future slot reservation references it. Restaurant hours cannot be changed
  to exclude a future reserved slot.
- Availability is returned by
  `GET /api/tables/restaurant/:restaurantId/availability?eventId=:eventId` or
  `GET /api/tables/restaurant/:restaurantId/availability?eventDate=YYYY-MM-DD`.
  The registration and booking APIs validate the selection again on submit.
- A unique MongoDB index on restaurant, reservation date, start time, and
  section prevents overlapping reservations, including concurrent requests.
  Creating an event with a restaurant reservation claims all section locks
  immediately, before attendee registrations. The organizer's selected tables,
  capacity, food, and beverages are saved with the event. Deleting the event releases its slot and
  registration-held slots; changing its date is rejected while its slot is
  reserved. Cancelling a registration releases its slot. Pending and confirmed
  bookings continue to hold their slot.
- Older reservations without a time are treated as occupying their section for
  the entire event date. This also applies when multiple events share the same
  date.
