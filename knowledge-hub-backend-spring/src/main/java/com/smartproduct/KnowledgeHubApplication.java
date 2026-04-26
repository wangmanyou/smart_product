package com.smartproduct;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@MapperScan("com.smartproduct.mapper")
@SpringBootApplication
public class KnowledgeHubApplication {
    public static void main(String[] args) {
        SpringApplication.run(KnowledgeHubApplication.class, args);
    }
}
