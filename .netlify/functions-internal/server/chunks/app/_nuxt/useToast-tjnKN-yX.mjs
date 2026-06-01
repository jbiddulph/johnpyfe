import{i as e}from"../server.mjs";function useToast(){const t=e("notifications",(()=>[]));return{add:function(e){const i={id:(new Date).getTime().toString(),...e};return-1===t.value.findIndex((e=>e.id===i.id))&&t.value.push(i),i},remove:function(e){t.value=t.value.filter((t=>t.id!==e))}}}export{useToast as u};
//# sourceMappingURL=useToast-tjnKN-yX.mjs.map
