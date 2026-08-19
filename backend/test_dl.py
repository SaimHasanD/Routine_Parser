from dotenv import load_dotenv
load_dotenv()
from app.shared import supabase_client, SUPABASE_BUCKET
print(supabase_client)
try:
    res = supabase_client.storage.from_(SUPABASE_BUCKET).download('exam_schedule_image.jpeg')
    print('jpeg:', len(res))
except Exception as e:
    print(f'Error jpeg: {e}')
try:
    res = supabase_client.storage.from_(SUPABASE_BUCKET).download('exam_schedule_image.jpg')
    print('jpg:', len(res))
except Exception as e:
    print(f'Error jpg: {e}')
