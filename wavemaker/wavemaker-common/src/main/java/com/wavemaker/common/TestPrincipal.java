package com.wavemaker.common;

import java.security.Principal;

public class TestPrincipal implements Principal {
	private String name;

	public TestPrincipal( String n) {
		if ( null == n )
			throw new NullPointerException();
		name = n;
	}

	@Override
	public boolean equals( Object o) { return name.equals( o); }

	@Override
	public String getName() { return name; }

	@Override
	public int hashCode() { return name.hashCode(); }

	@Override
	public String toString() { return name; }
}
