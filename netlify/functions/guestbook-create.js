// POST /.netlify/functions/guestbook-create
// 방명록을 등록한다. 서버 측에서 입력값을 다시 검증한 뒤 Supabase 에 저장한다.
// 요청 body(JSON): { "nickname": "별명", "message": "메시지" }

const { createClient } = require('@supabase/supabase-js');

const NICK_MIN = 2;
const NICK_MAX = 12;
const MSG_MIN = 1;
const MSG_MAX = 100;

exports.handler = async (event) => {
  // 이 엔드포인트는 POST 만 허용
  if (event.httpMethod !== 'POST') {
    return json(405, { error: '허용되지 않은 메서드입니다.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: '서버 환경변수가 설정되지 않았습니다.' });
  }

  // 1) body 파싱
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: '요청 형식이 올바르지 않습니다.' });
  }

  // 2) 서버 측 검증 (브라우저 검증과 별개로 반드시 재검증)
  const rawNickname = payload.nickname;
  const rawMessage = payload.message;

  if (typeof rawNickname !== 'string' || typeof rawMessage !== 'string') {
    return json(400, { error: '별명과 메시지를 모두 입력해 주세요.' });
  }

  const nickname = rawNickname.trim();
  const message = rawMessage.trim();

  // 글자 수는 코드포인트 기준으로 센다([...str].length).
  // 기본 .length(UTF-16 코드유닛)와 달리 이모지 등 서로게이트 쌍을 1자로 계산한다.
  const nickLen = [...nickname].length;
  const msgLen = [...message].length;

  if (nickLen < NICK_MIN || nickLen > NICK_MAX) {
    return json(400, { error: `별명은 ${NICK_MIN}~${NICK_MAX}자여야 합니다.` });
  }
  if (msgLen < MSG_MIN || msgLen > MSG_MAX) {
    return json(400, { error: `메시지는 ${MSG_MIN}~${MSG_MAX}자여야 합니다.` });
  }

  // 3) 저장
  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('guestbook')
      .insert({ nickname, message })
      .select('id, nickname, message, created_at')
      .single();

    if (error) {
      return json(500, { error: '방명록 저장에 실패했습니다.' });
    }

    return json(201, { item: data });
  } catch (e) {
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
