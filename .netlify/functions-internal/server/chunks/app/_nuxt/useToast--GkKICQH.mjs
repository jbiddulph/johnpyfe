import{h as e}from"../server.mjs";function useToast(){const t=e("notifications",(()=>[]));return{add:function(e){const n={id:(new Date).getTime().toString(),...e};return-1===t.value.findIndex((e=>e.id===n.id))&&t.value.push(n),n},remove:function(e){t.value=t.value.filter((t=>t.id!==e))}}}export{useToast as u};
//# sourceMappingURL=useToast--GkKICQH.mjs.map
