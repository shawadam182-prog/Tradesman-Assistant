import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MapPin, Mic, Loader2, MapPinned, LocateFixed, Navigation, ExternalLink
} from 'lucide-react';
import { formatAddressAI, reverseGeocode } from '../src/services/geminiService';
import { hapticTap } from '../src/hooks/useHaptic';

// Google Places types
declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
  }
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  className?: string;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  isListening?: boolean;
  disabled?: boolean;
}

// Track if Google Places script is loaded
let googlePlacesLoaded = false;
let googlePlacesLoading = false;
const loadCallbacks: (() => void)[] = [];

const loadGooglePlaces = (apiKey: string): Promise<void> => {
  return new Promise((resolve) => {
    if (googlePlacesLoaded) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (googlePlacesLoading) {
      return;
    }

    googlePlacesLoading = true;

    // Define callback before loading script
    window.initGooglePlaces = () => {
      googlePlacesLoaded = true;
      googlePlacesLoading = false;
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
};

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Start typing address or postcode...",
  className = "",
  onVoiceStart,
  onVoiceEnd,
  isListening = false,
  disabled = false,
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [placesReady, setPlacesReady] = useState(false);
  const [showFallbackSuggestions, setShowFallbackSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Google Places API
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      console.warn('Google Places API key not configured. Using fallback mode.');
      return;
    }

    loadGooglePlaces(apiKey).then(() => {
      setPlacesReady(true);
    });
  }, []);

  // Initialize autocomplete when ready
  useEffect(() => {
    if (!placesReady || !inputRef.current || autocompleteRef.current) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'gb' }, // UK only
        fields: ['formatted_address', 'address_components', 'geometry'],
        types: ['address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          onChange(place.formatted_address);
          hapticTap();
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (err) {
      console.error('Failed to initialize Google Places:', err);
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [placesReady, onChange]);

  // Handle GPS location
  const handleUseCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    hapticTap();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const address = await reverseGeocode(latitude, longitude);
          if (address) {
            onChange(address);
          } else {
            alert("Could not determine address from your location.");
          }
        } catch (err) {
          alert("Failed to geocode your location.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        alert("Location access denied or unavailable.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [onChange]);

  // Handle AI verification
  const handleVerifyAddress = useCallback(async () => {
    if (!value.trim()) return;

    setIsVerifying(true);
    hapticTap();

    try {
      const formatted = await formatAddressAI(value);
      onChange(formatted);
    } catch (err) {
      console.error('Address verification failed:', err);
    } finally {
      setIsVerifying(false);
    }
  }, [value, onChange]);

  // Open in Google Maps
  const openInMaps = useCallback(() => {
    if (!value.trim()) return;
    hapticTap();
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }, [value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div ref={containerRef} className="space-y-0.5 relative">
      <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5 italic px-1">
        <MapPin size={10} className="md:w-3 md:h-3" /> Address
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 md:px-4 md:py-4 pr-36 md:pr-44 text-slate-950 font-bold text-sm md:text-base outline-none focus:bg-white focus:border-amber-500 transition-all ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          autoComplete="off"
        />

        {/* Action buttons */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
          {/* Voice input button */}
          {onVoiceStart && (
            <button
              type="button"
              onClick={() => {
                hapticTap();
                if (isListening) {
                  onVoiceEnd?.();
                } else {
                  onVoiceStart();
                }
              }}
              className={`p-1.5 md:p-2 rounded-lg transition-all ${
                isListening
                  ? 'bg-red-500 text-white'
                  : 'text-slate-300 hover:text-amber-500 bg-transparent'
              }`}
              title="Voice input"
            >
              <Mic size={14} className="md:w-[18px] md:h-[18px]" />
            </button>
          )}

          {/* GPS location button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="p-1.5 md:p-2 rounded-lg transition-all text-blue-500 hover:text-blue-700 disabled:opacity-30 bg-transparent"
            title="Use current location"
          >
            {isLocating ? (
              <Loader2 size={14} className="md:w-[18px] md:h-[18px] animate-spin" />
            ) : (
              <LocateFixed size={14} className="md:w-[18px] md:h-[18px]" />
            )}
          </button>

          {/* AI verify button */}
          <button
            type="button"
            onClick={handleVerifyAddress}
            disabled={!value.trim() || isVerifying}
            className="p-1.5 md:p-2 rounded-lg transition-all text-amber-500 hover:text-amber-700 disabled:opacity-30 bg-transparent"
            title="AI verify & format address"
          >
            {isVerifying ? (
              <Loader2 size={14} className="md:w-[18px] md:h-[18px] animate-spin" />
            ) : (
              <MapPinned size={14} className="md:w-[18px] md:h-[18px]" />
            )}
          </button>

          {/* Open in Maps button */}
          <button
            type="button"
            onClick={openInMaps}
            disabled={!value.trim()}
            className="p-1.5 md:p-2 rounded-lg transition-all text-green-600 hover:text-green-700 disabled:opacity-30 bg-transparent"
            title="Open in Google Maps"
          >
            <Navigation size={14} className="md:w-[18px] md:h-[18px]" />
          </button>
        </div>
      </div>

      {/* Powered by Google indicator when Places is active */}
      {placesReady && (
        <div className="flex items-center justify-end px-1 pt-0.5">
          <span className="text-[8px] text-slate-300 italic">Powered by Google</span>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
