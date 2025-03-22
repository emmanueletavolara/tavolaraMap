import * as Location from 'expo-location';

// Regione iniziale della mappa (Spalmatore di Terra, Tavolara)
export const INITIAL_REGION = {
  latitude: 40.8985,
  longitude: 9.7225,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
} as const;

// Impostazioni per il monitoraggio della posizione
export const LOCATION_TRACKING_OPTIONS = {
  accuracy: Location.Accuracy.High,
  timeInterval: 1000,      // Milliseconds
  distanceInterval: 1,     // Meters
} as const;

// Impostazioni della mappa
export const MAP_OPTIONS = {
  showsUserLocation: true,
  showsMyLocationButton: true,
  showsCompass: true,
  provider: 'google',      // 'google' | 'apple'
} as const;

// Stili per la visualizzazione del percorso
export const ROUTE_STYLE = {
  strokeColor: '#0066cc',
  strokeWidth: 3,
} as const;

export class LocationFilter {
    private locationHistory: Location.LocationObjectCoords[] = [];
    private headingHistory: number[] = [];
    private lastStablePosition: Location.LocationObjectCoords | null = null;
    private readonly locationHistorySize = 6;     // Più grande per migliore stabilità
    private readonly headingHistorySize = 10;
    private readonly movementThreshold = 2.5;     // Più sensibile ai piccoli spostamenti
    private readonly accuracyThreshold = 15;      // Accettiamo anche letture meno precise
    private readonly minReadingsForFix = 3;       // Richiede almeno 3 letture per stabilizzarsi
    private stableCount = 0;
    private readonly requiredStableCount = 4;     // Maggiore per evitare falsi positivi
    private lastUpdateTime: number = Date.now();
    private readonly kalmanQ = 0.1;  // Process noise
    private readonly kalmanR = 1.0;  // Measurement noise
    private kalmanP = 1.0;          // Error covariance
    private readonly accuracyThresholdHigh = 50;  // Ignora completamente letture sopra 50m
    private readonly speedThreshold = 0.5;        // Sotto 0.5 m/s consideriamo il dispositivo fermo

    addLocation(location: Location.LocationObjectCoords): Location.LocationObjectCoords {
        const currentTime = Date.now();
        this.lastUpdateTime = currentTime;

        // Ignora letture con accuratezza pessima (>100m)
        if (location.accuracy > 100) {
            return this.lastStablePosition || location;
        }

        // Normalizza la posizione e limita l'accuratezza massima accettata
        const normalizedLocation = {
            ...location,
            accuracy: Math.min(location.accuracy, this.accuracyThreshold)
        };

        // Aggiunge la posizione alla cronologia, rimuovendo la più vecchia se necessario
        this.locationHistory.push(normalizedLocation);
        if (this.locationHistory.length > this.locationHistorySize) {
            this.locationHistory.shift();
        }

        // Se abbiamo meno dati di quelli richiesti, restituiamo l'ultima posizione nota
        if (this.locationHistory.length < this.minReadingsForFix) {
            return this.lastStablePosition || normalizedLocation;
        }

        // Calcola la posizione filtrata
        const filteredPosition = this.kalmanFilteredPosition(this.locationHistory);

        // Processa il valore dell'heading
        const filteredHeading = this.processHeading(location.heading);

        // Calcola la distanza dall'ultima posizione stabile
        if (this.lastStablePosition) {
            const distance = this.calculateDistance(
                this.lastStablePosition.latitude,
                this.lastStablePosition.longitude,
                filteredPosition.latitude,
                filteredPosition.longitude
            );

            if (distance < this.movementThreshold) {
                this.stableCount++;

                if (this.stableCount >= this.requiredStableCount) {
                    return {
                        ...this.lastStablePosition,
                        heading: filteredHeading,
                        speed: 0
                    };
                }
            } else {
                this.stableCount = 0;

                // Interpolazione per evitare salti bruschi
                const blendFactor = 0.4;
                this.lastStablePosition = {
                    latitude: this.lastStablePosition.latitude * blendFactor + filteredPosition.latitude * (1 - blendFactor),
                    longitude: this.lastStablePosition.longitude * blendFactor + filteredPosition.longitude * (1 - blendFactor),
                    altitude: (this.lastStablePosition.altitude || 0) * blendFactor + (filteredPosition.altitude || 0) * (1 - blendFactor),
                    accuracy: this.accuracyThreshold,
                    heading: filteredHeading,
                    speed: location.speed || 0
                };
            }
        } else {
            this.lastStablePosition = filteredPosition;
        }

        return { ...this.lastStablePosition, heading: filteredHeading };
    }

    private kalmanFilteredPosition(readings: Location.LocationObjectCoords[]): Location.LocationObjectCoords {
        let estimate = readings[0];
        let P = this.kalmanP;
        let validMeasurements = 0;

        for (const measurement of readings.slice(1)) {
            // Ignora letture troppo imprecise
            if (measurement.accuracy > this.accuracyThresholdHigh) continue;

            validMeasurements++;
            
            // Predizione
            const Q = this.kalmanQ;
            P = P + Q;

            // Aggiornamento con peso basato sull'accuratezza
            const accuracyWeight = Math.max(0, 1 - measurement.accuracy / this.accuracyThresholdHigh);
            const K = (P / (P + this.kalmanR)) * accuracyWeight;
            
            estimate = {
                latitude: estimate.latitude + K * (measurement.latitude - estimate.latitude),
                longitude: estimate.longitude + K * (measurement.longitude - estimate.longitude),
                altitude: (estimate.altitude || 0) + K * ((measurement.altitude || 0) - (estimate.altitude || 0)),
                accuracy: Math.min(estimate.accuracy || measurement.accuracy, measurement.accuracy)
            };
            P = (1 - K) * P;
        }

        this.kalmanP = P;
        
        // Se non abbiamo misurazioni valide, manteniamo l'ultima posizione stabile
        if (validMeasurements === 0) {
            return this.lastStablePosition || readings[0];
        }

        return estimate;
    }

    private processHeading(location: Location.LocationObjectCoords): number | null | undefined {
        const heading = location.heading;
        
        if (heading === null || heading === undefined) {
            return this.lastStablePosition?.heading || heading;
        }

        // Se il dispositivo è quasi fermo, mantieni l'heading precedente
        if (location.speed !== undefined && 
            location.speed < this.speedThreshold && 
            this.lastStablePosition?.heading !== undefined) {
            return this.lastStablePosition.heading;
        }

        this.headingHistory.push(heading);
        if (this.headingHistory.length > this.headingHistorySize) {
            this.headingHistory.shift();
        }

        if (this.headingHistory.length < 2) {
            return heading;
        }

        const normalizedHeadings = this.normalizeHeadings(this.headingHistory);

        let totalWeight = 0;
        let weightedSum = 0;

        // Peso maggiore per le letture più recenti quando in movimento
        const speedFactor = location.speed ? Math.min(location.speed / 2, 1) : 0.5;
        
        for (let i = 0; i < normalizedHeadings.length; i++) {
            const weight = ((i + 1) / this.headingHistory.length) * (1 + speedFactor);
            weightedSum += normalizedHeadings[i] * weight;
            totalWeight += weight;
        }

        let smoothedHeading = weightedSum / totalWeight;
        
        if (this.lastStablePosition?.heading !== undefined) {
            // Smoothing exponenziale con alpha dinamico basato sulla velocità
            const alpha = location.speed && location.speed > this.speedThreshold 
                ? Math.min(0.3 + location.speed / 10, 0.7) 
                : 0;
            
            smoothedHeading = alpha * smoothedHeading + (1 - alpha) * this.lastStablePosition.heading;
        }
        
        return (smoothedHeading + 360) % 360;
    }

    private normalizeHeadings(headings: number[]): number[] {
        const result = [...headings];

        for (let i = 1; i < result.length; i++) {
            const prev = result[i - 1];
            let current = result[i];

            if (Math.abs(current - prev) > 180) {
                if (current < prev) {
                    result[i] = current + 360;
                } else {
                    result[i] = current - 360;
                }
            }
        }

        return result;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3;
        const φ1 = this.toRadians(lat1);
        const φ2 = this.toRadians(lat2);
        const Δφ = this.toRadians(lat2 - lat1);
        const Δλ = this.toRadians(lon2 - lon1);

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    private toRadians(degrees: number): number {
        return degrees * Math.PI / 180;
    }
}
