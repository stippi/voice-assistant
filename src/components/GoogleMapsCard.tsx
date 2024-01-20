import React from 'react'
import {GoogleMap, useJsApiLoader} from '@react-google-maps/api';
import {GooglePlacesApiKey} from "../secrets.ts";

const containerStyle = {
  width: '100%',
  height: '400px'
};

function MapComponent({key, latitude, longitude, zoom = 10}: Props) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GooglePlacesApiKey
  })
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [map, setMap] = React.useState<google.maps.Map | null>(null)
  
  const center = {
    lat: latitude,
    lng: longitude
  };
  
  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    const bounds = new window.google.maps.LatLngBounds(center);
    map.fitBounds(bounds);
    
    setMap(map)
  }, [center])
  
  const onUnmount = React.useCallback(function callback() {
    setMap(null)
  }, [])
  
  return isLoaded ? (
    <GoogleMap
      key={key}
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      { /* Child components, such as markers, info windows, etc. */ }
      <></>
    </GoogleMap>
  ) : <></>
}

export const GoogleMapsCard = React.memo(MapComponent);

interface Props {
  key: number;
  latitude: number;
  longitude: number;
  zoom?: number;
}