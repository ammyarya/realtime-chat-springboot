package com.chatapp.realtimechat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    /* CORS is configured in SecurityConfig (CorsConfigurationSource) */
}
