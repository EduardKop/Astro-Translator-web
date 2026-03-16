import { NextResponse } from "next/server"

const COUNTRIES = [
  { id: "az", code: "AZ", name: "Azerbaijan",  nameRu: "Азербайджан", lang: "Azerbaijani", emoji: "🇦🇿", currency_code: "AZN", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "gb", code: "GB", name: "England",      nameRu: "Англия",      lang: "English",     emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", currency_code: "GBP", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "am", code: "AM", name: "Armenia",      nameRu: "Армения",     lang: "Armenian",    emoji: "🇦🇲", currency_code: "AMD", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "be", code: "BE", name: "Belgium",      nameRu: "Бельгия",     lang: "Dutch",       emoji: "🇧🇪", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "bg", code: "BG", name: "Bulgaria",     nameRu: "Болгария",    lang: "Bulgarian",   emoji: "🇧🇬", currency_code: "BGN", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "br", code: "BR", name: "Brazil",       nameRu: "Бразилия",    lang: "Portuguese",  emoji: "🇧🇷", currency_code: "BRL", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "hu", code: "HU", name: "Hungary",      nameRu: "Венгрия",     lang: "Hungarian",   emoji: "🇭🇺", currency_code: "HUF", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "de", code: "DE", name: "Germany",      nameRu: "Германия",    lang: "German",      emoji: "🇩🇪", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "gr", code: "GR", name: "Greece",       nameRu: "Греция",      lang: "Greek",       emoji: "🇬🇷", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "ge", code: "GE", name: "Georgia",      nameRu: "Грузия",      lang: "Georgian",    emoji: "🇬🇪", currency_code: "GEL", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "dk", code: "DK", name: "Denmark",      nameRu: "Дания",       lang: "Danish",      emoji: "🇩🇰", currency_code: "DKK", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "eg", code: "EG", name: "Egypt",        nameRu: "Египет",      lang: "Arabic",      emoji: "🇪🇬", currency_code: "EGP", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "es", code: "ES", name: "Spain",        nameRu: "Испания",     lang: "Spanish",     emoji: "🇪🇸", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "it", code: "IT", name: "Italy",        nameRu: "Италия",      lang: "Italian",     emoji: "🇮🇹", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "lv", code: "LV", name: "Latvia",       nameRu: "Латвия",      lang: "Latvian",     emoji: "🇱🇻", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "lt", code: "LT", name: "Lithuania",    nameRu: "Литва",       lang: "Lithuanian",  emoji: "🇱🇹", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "mx", code: "MX", name: "Mexico",       nameRu: "Мексика",     lang: "Spanish",     emoji: "🇲🇽", currency_code: "MXN", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "nl", code: "NL", name: "Netherlands",  nameRu: "Нидерланды",  lang: "Dutch",       emoji: "🇳🇱", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "no", code: "NO", name: "Norway",       nameRu: "Норвегия",    lang: "Norwegian",   emoji: "🇳🇴", currency_code: "NOK", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "pl", code: "PL", name: "Poland",       nameRu: "Польша",      lang: "Polish",      emoji: "🇵🇱", currency_code: "PLN", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "pt", code: "PT", name: "Portugal",     nameRu: "Португалия",  lang: "Portuguese",  emoji: "🇵🇹", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "ro", code: "RO", name: "Romania",      nameRu: "Румыния",     lang: "Romanian",    emoji: "🇷🇴", currency_code: "RON", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "tr", code: "TR", name: "Turkey",       nameRu: "Турция",      lang: "Turkish",     emoji: "🇹🇷", currency_code: "TRY", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "uz", code: "UZ", name: "Uzbekistan",   nameRu: "Узбекистан",  lang: "Uzbek",       emoji: "🇺🇿", currency_code: "UZS", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "ua", code: "UA", name: "Ukraine",      nameRu: "Украина",     lang: "Ukrainian",   emoji: "🇺🇦", currency_code: "UAH", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "fi", code: "FI", name: "Finland",      nameRu: "Финляндия",   lang: "Finnish",     emoji: "🇫🇮", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "fr", code: "FR", name: "France",       nameRu: "Франция",     lang: "French",      emoji: "🇫🇷", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "hr", code: "HR", name: "Croatia",      nameRu: "Хорватия",    lang: "Croatian",    emoji: "🇭🇷", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "cz", code: "CZ", name: "Czechia",      nameRu: "Чехия",       lang: "Czech",       emoji: "🇨🇿", currency_code: "CZK", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "se", code: "SE", name: "Sweden",       nameRu: "Швеция",      lang: "Swedish",     emoji: "🇸🇪", currency_code: "SEK", shift_start: "09:00", shift_end: "17:00", is_active: true },
  { id: "ee", code: "EE", name: "Estonia",      nameRu: "Эстония",     lang: "Estonian",    emoji: "🇪🇪", currency_code: "EUR", shift_start: "09:00", shift_end: "17:00", is_active: true },
]

export async function GET() {
  return NextResponse.json({ countries: COUNTRIES })
}
