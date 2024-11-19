
import { createClient } from '@supabase/supabase-js';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const supabase = createClient(config.public.supabaseUrl, config.public.supabaseKey);
  const { id } = event.context.params;
  const body = await readBody(event);

  // ...existing code...

  if (body.photoUrl) {
    const { data, error } = await supabase
      .from('venues')
      .update({ photo_url: body.photoUrl })
      .eq('id', id);

    if (error) {
      return { statusCode: 500, body: { error: error.message } };
    }

    return { statusCode: 200, body: { data } };
  }

  // ...existing code...
});