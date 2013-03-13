package com.wavemaker.common;

import javax.security.auth.Destroyable;

public class TestPrivCredential implements Destroyable {
	private char[] pwd;
	private boolean defunct = false;

	public TestPrivCredential( char[] p) {
		if ( null == p )
			throw new NullPointerException();
		pwd = p.clone();
	}

	@Override
	public void destroy() {
		for ( int i = 0 ; i < pwd.length ; ++ i )
			pwd[i] = 0;
		defunct = true;
	}

	@Override
	public boolean isDestroyed() { return defunct; }

	private void assertViable() {
		if ( defunct )
			throw new IllegalStateException();
	}

	@Override
	public boolean equals( Object o) {
		assertViable();
		return pwd.equals( o);
	}

	@Override
	public int hashCode() {
		assertViable();
		return pwd.hashCode();
	}

	@Override
	public String toString() {
		assertViable();
		return new String( pwd);
	}
}
