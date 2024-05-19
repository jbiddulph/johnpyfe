<template>
  <div>
    xxx
    <!-- <div ref="streetview" style="width: 100%; height: 400px;"></div> -->
  </div>
</template>

<script setup>
  const streetview = ref(null);
  onMounted(() => {
    if (process.client) {
      const googleMapsKey = useRuntimeConfig().public.googleMaps.key;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=streetview`;
      script.onload = () => {
        // Initialize Street View panorama
        const panorama = new google.maps.StreetViewPanorama(streetview.value, {
          position: {lat: lat.value, lng: lng.value}, // Set initial location
          pov: {heading: 165, pitch: 0}, // Set initial point of view
          zoom: 1 // Set initial zoom level
        });
      };
      document.head.appendChild(script);
    }
  });

</script>