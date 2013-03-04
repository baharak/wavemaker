package com.wavemaker.common;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class FileThreadLocal<T> {
	public static final String ROOT_DIR = "/tmp/.tl"; 
	private final File dir;

	public FileThreadLocal() {
		this(new File(ROOT_DIR));
	}

	public FileThreadLocal(String id) {
		this(new File(ROOT_DIR, id));
	}

	private FileThreadLocal(File dir) {
		this.dir = dir;
		this.dir.mkdirs();
	}

	public void set(T val) {
		checkSerializable(val);

		File file = getFile();
		if (file.exists()) {
			remove();
		}
		try {
			file.createNewFile();
			ObjectOutputStream out = new ObjectOutputStream(
					new BufferedOutputStream(
							new FileOutputStream(file)));
			try {
				out.writeObject(val);
			} finally {
				out.close();
			}
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public T get() {
		File file = getFile();
		if (!file.exists())
			return null;
		ObjectInputStream out;
		try {
			out = new ObjectInputStream(
					new BufferedInputStream(
							new FileInputStream(file)));
			try {
				return (T) out.readObject();
			} finally {
				out.close();
			}
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		} catch (ClassNotFoundException e) {
			e.printStackTrace();
		}
		return null;
	}

	public void remove() {
		getFile().delete();
	}

	private File getFile() {
		return new File(dir, Thread.currentThread().getName());
	}

	private static <T> void checkSerializable(T val) {
		if (!(val instanceof Serializable))
			throw new IllegalArgumentException();
	}
}
