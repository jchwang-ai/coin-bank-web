import { NextRequest, NextResponse } from 'next/server';
import { authenticate, logAccess } from '@/lib/auth';

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

    // 쿠키에 세션 정보 저장
    response.cookies.set('logId', logId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    response.cookies.set('role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
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
