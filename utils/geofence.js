const axios = require("axios");

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Haversine - accurate distance in meters
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Snap employee GPS to nearest road (removes GPS drift/noise)
const snapToRoad = async (lat, long) => {
  try {
    const url = `https://roads.googleapis.com/v1/snapToRoads?path=${lat},${long}&key=${GOOGLE_API_KEY}`;
    const { data } = await axios.get(url);
    if (data.snappedPoints?.length) {
      const { latitude, longitude } = data.snappedPoints[0].location;
      return { lat: latitude, long: longitude, snapped: true };
    }
  } catch (_) {}
  return { lat, long, snapped: false };
};

// Reverse geocode - lat/long → human readable address
const reverseGeocode = async (lat, long) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${GOOGLE_API_KEY}`;
    const { data } = await axios.get(url);
    if (data.results?.length) return data.results[0].formatted_address;
  } catch (_) {}
  return null;
};

// Main geofence check
// Returns: { withinRadius, distance, snappedLat, snappedLong, address, violation }
const checkGeofence = async (empLat, empLong, officeLat, officeLong, radiusMeters) => {
  const snapped = await snapToRoad(empLat, empLong);
  const distance = Math.round(haversineDistance(snapped.lat, snapped.long, officeLat, officeLong));
  const withinRadius = distance <= radiusMeters;
  const address = await reverseGeocode(snapped.lat, snapped.long);

  return {
    withinRadius,
    distance,
    allowedRadius: radiusMeters,
    snappedLat: snapped.lat,
    snappedLong: snapped.long,
    snapped: snapped.snapped,
    address,
    violation: !withinRadius
      ? `Employee is ${distance - radiusMeters}m outside the allowed zone`
      : null,
  };
};

// Validate office lat/long on Google Maps (used when admin creates/updates office)
const validateOfficeLocation = async (lat, long) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${GOOGLE_API_KEY}`;
    const { data } = await axios.get(url);
    if (data.status === "OK" && data.results?.length) {
      return {
        valid: true,
        address: data.results[0].formatted_address,
        placeId: data.results[0].place_id,
      };
    }
    return { valid: false, address: null };
  } catch (_) {
    return { valid: false, address: null };
  }
};

// Geocode address string → lat/long (admin can search address to pin office)
const geocodeAddress = async (address) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
    const { data } = await axios.get(url);
    if (data.results?.length) {
      const { lat, lng } = data.results[0].geometry.location;
      return {
        lat,
        long: lng,
        address: data.results[0].formatted_address,
        placeId: data.results[0].place_id,
      };
    }
    return null;
  } catch (_) {
    return null;
  }
};

module.exports = { checkGeofence, validateOfficeLocation, geocodeAddress, haversineDistance };
