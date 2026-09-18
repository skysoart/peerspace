import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {

  // CHANGE this after deployment
  static const String baseUrl =
      "https://hack-a-thon.onrender.com";

  static Future<Map<String, dynamic>> signup(
      String username, String phone) async {

    final response = await http.post(
      Uri.parse("$baseUrl/signup"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "username": username,
        "phone": phone
      }),
    );

    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> moderate(String text) async {

    final response = await http.post(
      Uri.parse("$baseUrl/moderate"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "text": text
      }),
    );

    return jsonDecode(response.body);
  }
}