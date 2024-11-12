<template>
  <div class="text-center w-full">
    <div class="w-full">
      <button @click="toggleList">NAMES LIST</button>
    </div>
    <div v-show="showList" class="scroll-y h-100 flex">
      <div class="overflow-y-scroll scroll-y h-[24rem]">
        <h3 class="mb-2 text-2xl text-center">Heres just a few from most popular</h3>
        <ul class="overflow-y-auto flex flex-row flex-wrap justify-center">
          <li class="pr-2 pb-2">
            <UBadge color="amber" @click="selectVenueName('VENUES')" :ui="{ rounded: 'rounded-full' }">All Venues <span class="font-bold">(51,162)</span></UBadge>
          </li>
          <li v-for="(name, index) in venuenames" :key="index" class="pr-2 pb-2">
            <UBadge @click="selectVenueName(name.venuename)" :ui="{ rounded: 'rounded-full' }">{{ name.venuename }} <span class="font-bold">({{ name._count.venuename }})</span></UBadge>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const emit = defineEmits(["venueName"])
const props = defineProps({
  venuenames: {
    type: Array,
    required: true
  }
})
const showList = ref(false);

const selectVenueName = (name: any) => {
  showList.value = false
  emit('venueName', name)
}

const toggleList = () => {
  showList.value = !showList.value;
}
</script>
