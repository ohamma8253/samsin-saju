export interface CityInfo {
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: Record<string, CityInfo> = {
  seoul:   { name: '서울',  lat: 37.5665, lng: 126.9780 },
  busan:   { name: '부산',  lat: 35.1796, lng: 129.0756 },
  daegu:   { name: '대구',  lat: 35.8714, lng: 128.6014 },
  incheon: { name: '인천',  lat: 37.4563, lng: 126.7052 },
  gwangju: { name: '광주',  lat: 35.1595, lng: 126.8526 },
  daejeon: { name: '대전',  lat: 36.3504, lng: 127.3845 },
  ulsan:   { name: '울산',  lat: 35.5384, lng: 129.3114 },
  sejong:  { name: '세종',  lat: 36.4800, lng: 127.2600 },
  jeju:    { name: '제주',  lat: 33.4996, lng: 126.5312 },
};

export const DEFAULT_CITY = 'seoul';

export function getCityCoords(cityKey: string): { lat: number; lng: number } {
  const city = CITIES[cityKey];
  if (city) return { lat: city.lat, lng: city.lng };
  return { lat: CITIES.seoul.lat, lng: CITIES.seoul.lng };
}
