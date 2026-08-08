import { describe, expect, it } from "vitest"
import { bookingEvents } from "../src/analytics"

describe("booking analytics classification", () => {
  it("classifies the valid 15-minute Cal.com booking", () => {
    expect(bookingEvents(new URL("https://cal.com/main-street-media-co-jfgesg/15min"))).toEqual([
      "booking_cta_clicked",
      "booking_15_minute_clicked",
    ])
  })

  it("classifies the valid 30-minute Cal.com booking", () => {
    expect(bookingEvents(new URL("https://cal.com/main-street-media-co-jfgesg/30min"))).toEqual([
      "booking_cta_clicked",
      "booking_30_minute_clicked",
    ])
  })

  it("does not classify unrelated links as bookings", () => {
    expect(bookingEvents(new URL("https://example.com/30min"))).toEqual([])
  })
})
