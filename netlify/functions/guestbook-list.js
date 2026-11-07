// GET /.netlify/functions/guestbook-list
// 방명록을 최신순으로 조회한다. (최근 100건)
// Supabase 접근은 서버 전용 service_role 키로만 수행한다.

const { createClient } = require('@supabase/supabase-js');

const MAX_ITEMS = 100;

exports.handler = async (event) => {
  // 이 엔드포인트는 GET 만 허용
  if (event.httpMethod !== 'GET') {
    return json(405, { error: '허용되지 않은 메서드입니다.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: '서버 환경변수가 설정되지 않았습니다.' });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('guestbook')
      .select('id, nickname, message, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS);

    if (error) {
      // Supabase 가 반환한 실제 오류를 서버 로그에만 기록한다 (환경변수 값은 남기지 않는다).
      console.error('[guestbook-list] supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return json(500, { error: '방명록을 불러오지 못했습니다.' });
    }

    return json(200, { items: data || [] });
  } catch (e) {
    // 예외 내용을 서버 로그에만 기록한다.
    console.error('[guestbook-list] unexpected error:', e && (e.stack || e.message || e));
    return json(500, { error: '서버 오류가 발생했습니다.' });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}
