package bookings

type BookingStatus string

const (
	Pending   BookingStatus = "PENDING"
	Confirmed BookingStatus = "CONFIRMED"
	Online    BookingStatus = "ONLINE"
	Cancelled BookingStatus = "CANCELLED"
)
