package net.arturkeska.http3;

import java.net.http.HttpClient;

public class CheckHTTP3Support {
    public static void main(String[] args) {
        System.out.println("Available HTTP client versions:");
        for (HttpClient.Version version : HttpClient.Version.values()) {
            System.out.println("  " + version);
        }
        
        System.out.println("\nJava version: " + System.getProperty("java.version"));
        System.out.println("Java vendor: " + System.getProperty("java.vendor"));
        System.out.println("Java home: " + System.getProperty("java.home"));
        
        try {
            HttpClient client = HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_2)
                    .build();
            System.out.println("\nHTTP/2 client created successfully");
        } catch (Exception e) {
            System.out.println("\nHTTP/2 client creation failed: " + e.getMessage());
        }
    }
}