package com.wavemaker.common;

public class TestPubCredential {
	private Object thing; // HttpSession anyone?

	public TestPubCredential( Object o) {
		if ( null == o )
			throw new NullPointerException();
		thing = o;
	}

	@Override
	public boolean equals( Object o) { return thing.equals( o); }

	@Override
	public int hashCode() { return thing.hashCode(); }

	@Override
	public String toString() { return thing.toString(); }
}
