export class LocationFilter {
    private locationHistory: Location.LocationObjectCoords[] = [];
    private headingHistory: number[] = [];
    private lastStablePosition: Location.LocationObjectCoords | null = null;
    private readonly locationHistorySize = 5;
    private readonly headingHistorySize = 8;
    private readonly movementThreshold = 1; // 1 metro di movimento minimo
  
    addLocation(location: Location.LocationObjectCoords): Location.LocationObjectCoords {
      // Aggiungi alla cronologia delle posizioni
      this.locationHistory.push(location);
      if (this.locationHistory.length > this.locationHistorySize) {
        this.locationHistory.shift();
      }
  
      // Filtra l'heading (mantenendolo aggiornato anche a dispositivo fermo)
      let filteredHeading = this.processHeading(location.heading);
  
      // Calcola la posizione filtrata
      let filteredPosition = {
        latitude: this.calculateAverage('latitude'),
        longitude: this.calculateAverage('longitude'),
        accuracy: this.calculateAverage('accuracy'),
        altitude: this.calculateAverage('altitude'),
        altitudeAccuracy: this.calculateAverage('altitudeAccuracy'),
        heading: filteredHeading,
        speed: location.speed
      };
  
      // Se abbiamo una posizione stabile precedente, verifica il movimento
      if (this.lastStablePosition) {
        const distance = this.calculateDistance(
          this.lastStablePosition.latitude,
          this.lastStablePosition.longitude,
          filteredPosition.latitude,
          filteredPosition.longitude
        );
  
        // Se il movimento è inferiore alla soglia, mantieni la posizione precedente
        // ma aggiorna comunque l'heading
        if (distance < this.movementThreshold) {
          return {
            ...this.lastStablePosition,
            heading: filteredHeading,
            speed: location.speed
          };
        }
      }
  
      // Aggiorna l'ultima posizione stabile
      this.lastStablePosition = filteredPosition;
      return filteredPosition;
    }
  
    private processHeading(heading: number | null | undefined): number | null | undefined {
      if (heading === null || heading === undefined) {
        return heading;
      }
  
      // Aggiungi alla cronologia degli heading
      this.headingHistory.push(heading);
      if (this.headingHistory.length > this.headingHistorySize) {
        this.headingHistory.shift();
      }
  
      // Non abbiamo abbastanza dati per filtrare
      if (this.headingHistory.length < 2) {
        return heading;
      }
  
      // Correggi il problema di wraparound (transizione 359° -> 0°)
      const normalizedHeadings = this.normalizeHeadings(this.headingHistory);
      
      // Applica un filtro passa-basso per smoothing
      // Dà più peso agli heading recenti
      let totalWeight = 0;
      let weightedSum = 0;
  
      for (let i = 0; i < normalizedHeadings.length; i++) {
        // Aumenta progressivamente il peso (gli ultimi valori hanno più peso)
        const weight = i + 1;
        weightedSum += normalizedHeadings[i] * weight;
        totalWeight += weight;
      }
  
      let smoothedHeading = weightedSum / totalWeight;
  
      // Normalizza a 0-360
      return (smoothedHeading + 360) % 360;
    }
  
    private normalizeHeadings(headings: number[]): number[] {
      // Gestisci la transizione 359° -> 0° per evitare salti
      const result = [...headings];
      
      for (let i = 1; i < result.length; i++) {
        const prev = result[i-1];
        let current = result[i];
        
        // Se c'è un salto di più di 180°, aggiungi/sottrai 360° per evitare discontinuità
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
  
    private calculateAverage(property: keyof Location.LocationObjectCoords): number {
      const values = this.locationHistory
        .map(loc => loc[property])
        .filter(val => val !== null && val !== undefined) as number[];
      
      if (values.length === 0) return 0;
      
      const sum = values.reduce((acc, val) => acc + val, 0);
      return sum / values.length;
    }
  
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      // Formula di Haversine per calcolare la distanza tra due punti GPS in metri
      const R = 6371e3; // raggio della Terra in metri
      const φ1 = this.toRadians(lat1);
      const φ2 = this.toRadians(lat2);
      const Δφ = this.toRadians(lat2 - lat1);
      const Δλ = this.toRadians(lon2 - lon1);
  
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
      return R * c; // distanza in metri
    }
  
    private toRadians(degrees: number): number {
      return degrees * Math.PI / 180;
    }
  
    // Metodo per resettare la posizione stabile (utile quando si vuole forzare un aggiornamento)
    public resetStablePosition(): void {
      this.lastStablePosition = null;
    }
  }