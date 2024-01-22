import React, {useCallback, useMemo, useState} from 'react'
import {DirectionsRenderer, DirectionsService, GoogleMap, useJsApiLoader} from '@react-google-maps/api';
import {GooglePlacesApiKey} from "../secrets.ts";

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.3rem'
};

const defaultDirections = {
  origin: '',
  destination: '',
  travelMode: "DRIVING" as google.maps.TravelMode
}

function MapComponent({latitude, longitude, zoom = 10, directions = defaultDirections}: Props) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GooglePlacesApiKey
  })
  
  const center = useMemo(() => {
    if (latitude === undefined || longitude === undefined) {
      return undefined;
    }
    return {
      lat: latitude,
      lng: longitude
    }
  }, [latitude, longitude]);
  
  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    if (center) {
      const bounds = new window.google.maps.LatLngBounds(center);
      map.fitBounds(bounds);
    }
  }, [center])
  
  const onUnmount = React.useCallback(function callback() {
  }, [])
  
  const [response, setResponse] = useState<google.maps.DirectionsResult | null>(null);
  
  const directionsCallback = useCallback(
    (
      result: google.maps.DirectionsResult | null,
      status: google.maps.DirectionsStatus
    ) => {
      if (result !== null) {
        if (status === 'OK') {
          setResponse(result);
        } else {
          console.log('response: ', result);
        }
      }
    },
    []
  );
  
  const directionsServiceOptions =
    useMemo<google.maps.DirectionsRequest>(() => {
      return directions
    }, [directions])
  
  const directionsResult = useMemo(() => {
    return {
      directions: response,
    }
  }, [response])
  
  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        streetViewControl: false,
        fullscreenControl: false,
        scrollwheel: false,
        mapTypeControl: false,
        draggableCursor: "grab",
        draggingCursor: "grabbing"
      }}
    >
      {directions.destination !== '' && directions.origin !== '' && (
        <DirectionsService
          options={directionsServiceOptions}
          callback={directionsCallback}
        />
      )}
      
      {directionsResult.directions && (
        <DirectionsRenderer options={directionsResult} />
      )}
    </GoogleMap>
  ) : <></>
}

export const GoogleMapsCard = React.memo(MapComponent);

interface TransitOptions {
  arrivalTime?: Date;
  departureTime?: Date;
  modes?: google.maps.TransitMode[];
  routingPreference?: google.maps.TransitRoutePreference;
}

interface Directions {
  origin: string;
  destination: string;
  travelMode: google.maps.TravelMode;
  transitOptions?: TransitOptions;
}

interface Props {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  directions?: Directions;
  transitOptions?: TransitOptions;
}