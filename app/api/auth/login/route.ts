import { NextRequest, NextResponse } from 'next/server';
import { authenticate, logAccess } from '@/lib/auth';

/** 로그인 세션 유지 기간 (90일). */
const SESSION_MAX_AGE = 90 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const { role, pin } = await request.json();

    if (!role || !pin) {
      return NextResponse.json(
        { error: '역할과 비밀번호를 입력해주세요' },
        { status: 400 }
      );
    }

    const auth = await authenticate(role as 'parent' | 'child', pin);
    if (!auth) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다' },
        { status: 401 }
      );
    }

    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    const logId = await logAccess(role as 'parent' | 'child', userAgent, ip);

    const response = NextResponse.json({
      success: true,
      role,
      userId: auth.id,
    });

    // 쿠키에 세션 정보 저장.
    // 가족용 앱이라 매일 PIN을 다시 넣게 하는 것보다 세션을 길게 유지하는 쪽이
    // 실사용에 맞다. 로그아웃('나가기')은 그대로 동작하고, PIN을 바꾸면
    // 다음 로그인부터 새 PIN이 적용된다.
    response.cookies.set('logId', logId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE,
    });

    response.cookies.set('role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
