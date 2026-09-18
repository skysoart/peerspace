import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:ui';
import 'dart:math' as math;
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'services/api_service.dart';

// --- GLOBAL STATE ---
bool globalAiModerationEnabled = true;
String globalUsername = "User";
String globalPhoneNumber = "";
// Standard "Unknown User" blank icon
String globalProfilePicture =
    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
Uint8List? globalProfileImageBytes;

// THEME NOTIFIER FOR LIGHT/DARK MODE
final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier(ThemeMode.dark);

void main() {
  runApp(const PeerspaceApp());
}

class PeerspaceApp extends StatelessWidget {
  const PeerspaceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
        valueListenable: themeNotifier,
        builder: (context, currentMode, child) {
          return MaterialApp(
            title: 'PEERSPACE',
            themeMode: currentMode,
            theme: ThemeData(
              brightness: Brightness.light,
              scaffoldBackgroundColor: const Color(0xFFF0F4F8),
              fontFamily: 'Roboto',
              colorScheme: const ColorScheme.light(
                primary: Color(0xFFE947F5),
                secondary: Color(0xFF2F4BA2),
                surface: Colors.white,
              ),
            ),
            darkTheme: ThemeData(
              brightness: Brightness.dark,
              scaffoldBackgroundColor: const Color(0xFF0D0E15),
              fontFamily: 'Roboto',
              colorScheme: const ColorScheme.dark(
                primary: Color(0xFFE947F5),
                secondary: Color(0xFF2F4BA2),
                surface: Color(0xFF161824),
              ),
            ),
            home: const SplashScreen(),
            debugShowCheckedModeBanner: false,
          );
        });
  }
}

// ==========================================
// 0. ANIMATION HELPERS & SNACKBAR
// ==========================================

class AnimatedPress extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  const AnimatedPress({super.key, required this.child, required this.onTap});

  @override
  State<AnimatedPress> createState() => _AnimatedPressState();
}

class _AnimatedPressState extends State<AnimatedPress> {
  double _scale = 1.0;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _scale = 0.90),
      onTapUp: (_) {
        setState(() => _scale = 1.0);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _scale = 1.0),
      child: AnimatedScale(
        scale: _scale,
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeOutCubic,
        child: widget.child,
      ),
    );
  }
}

void showAnimatedDialog(BuildContext context, Widget dialog) {
  showGeneralDialog(
    context: context,
    barrierDismissible: true,
    barrierLabel: "Dismiss",
    transitionDuration: const Duration(milliseconds: 400),
    pageBuilder: (context, animation, secondaryAnimation) => dialog,
    transitionBuilder: (context, animation, secondaryAnimation, child) {
      return ScaleTransition(
        scale: CurvedAnimation(parent: animation, curve: Curves.easeOutBack),
        child: FadeTransition(opacity: animation, child: child),
      );
    },
  );
}

void showGlassSnackBar(
    BuildContext context, String message, IconData icon, Color iconColor) {
  bool isDark = Theme.of(context).brightness == Brightness.dark;
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    elevation: 0,
    behavior: SnackBarBehavior.floating,
    backgroundColor: Colors.transparent,
    content: ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container( // Removed BackdropFilter for performance
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: isDark
              ? const Color(0xFF2A2D3E)
              : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: isDark ? Colors.white30 : Colors.black12, width: 1.5),
        ),
        child: Row(
          children: [
            Icon(icon, color: iconColor, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black87,
                  fontWeight: FontWeight.w900,
                  fontStyle: FontStyle.italic,
                  fontSize: 15,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  ));
}

// ==========================================
// 1. PAPER-TO-CUBE FOLDING LOGO
// ==========================================
class CubeFoldingLogo extends StatefulWidget {
  final double size;
  final Color color;
  const CubeFoldingLogo(
      {super.key, this.size = 50, this.color = const Color(0xFFE947F5)});

  @override
  State<CubeFoldingLogo> createState() => _CubeFoldingLogoState();
}

class _CubeFoldingLogoState extends State<CubeFoldingLogo>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller =
        AnimationController(vsync: this, duration: const Duration(seconds: 2))
          ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          double progress = Curves.easeInOutCubic.transform(_controller.value);
          return CustomPaint(
              painter: FoldableCubePainter(progress, widget.color));
        },
      ),
    );
  }
}

class FoldableCubePainter extends CustomPainter {
  final double progress;
  final Color color;

  FoldableCubePainter(this.progress, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2.2;

    final topPath = Path()
      ..moveTo(center.dx, center.dy - radius * 0.5)
      ..lineTo(center.dx + radius * 0.866, center.dy - radius * 0.1)
      ..lineTo(center.dx, center.dy + radius * 0.3)
      ..lineTo(center.dx - radius * 0.866, center.dy - radius * 0.1)
      ..close();

    final leftPath = Path()
      ..moveTo(center.dx, center.dy + radius * 0.3)
      ..lineTo(center.dx - radius * 0.866, center.dy - radius * 0.1)
      ..lineTo(center.dx - radius * 0.866,
          center.dy + radius * (0.8 * progress - 0.1))
      ..lineTo(center.dx, center.dy + radius * (0.3 + 0.8 * progress))
      ..close();

    final rightPath = Path()
      ..moveTo(center.dx, center.dy + radius * 0.3)
      ..lineTo(center.dx + radius * 0.866, center.dy - radius * 0.1)
      ..lineTo(center.dx + radius * 0.866,
          center.dy + radius * (0.8 * progress - 0.1))
      ..lineTo(center.dx, center.dy + radius * (0.3 + 0.8 * progress))
      ..close();

    final paintTop = Paint()
      ..color = color.withOpacity(0.9)
      ..style = PaintingStyle.fill;
    final paintLeft = Paint()
      ..color = color.withOpacity(0.6)
      ..style = PaintingStyle.fill;
    final paintRight = Paint()
      ..color = color.withOpacity(0.3)
      ..style = PaintingStyle.fill;

    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(progress * math.pi);
    canvas.scale(0.6 + progress * 0.4);
    canvas.translate(-center.dx, -center.dy);

    canvas.drawPath(topPath, paintTop);
    if (progress > 0.01) {
      canvas.drawPath(leftPath, paintLeft);
      canvas.drawPath(rightPath, paintRight);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant FoldableCubePainter oldDelegate) =>
      oldDelegate.progress != progress;
}

// ==========================================
// 1. BACKGROUNDS & PREMIUM LIQUID GLASS
// ==========================================

class FloatingLinesBackground extends StatefulWidget {
  final Widget child;
  const FloatingLinesBackground({super.key, required this.child});

  @override
  State<FloatingLinesBackground> createState() =>
      _FloatingLinesBackgroundState();
}

class _FloatingLinesBackgroundState extends State<FloatingLinesBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller =
        AnimationController(vsync: this, duration: const Duration(seconds: 8))
          ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Stack(
      children: [
        Container(
            color: isDark ? const Color(0xFF05050A) : const Color(0xFFF0F4F8)),
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) => CustomPaint(
              painter: _FloatingLinesPainter(_controller.value, isDark),
              size: Size.infinite),
        ),
        widget.child,
      ],
    );
  }
}

class _FloatingLinesPainter extends CustomPainter {
  final double time;
  final bool isDark;
  _FloatingLinesPainter(this.time, this.isDark);

  @override
  void paint(Canvas canvas, Size size) {
    final Color color1 = const Color(0xFF2F4BA2);
    final Color color2 = const Color(0xFFE947F5);
    final Rect rect = Offset.zero & size;

    final paint = Paint()
      ..shader = LinearGradient(colors: [
        color1.withOpacity(isDark ? 0.8 : 0.4),
        color2.withOpacity(isDark ? 0.8 : 0.4)
      ]).createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round
      ..isAntiAlias = true;

    _drawWaveGroup(canvas, size, paint,
        waveOffset: 0.3, waveHeight: 0.15, speedMulti: 1.0, lines: 6);
    _drawWaveGroup(canvas, size, paint,
        waveOffset: 0.6, waveHeight: 0.20, speedMulti: -0.8, lines: 4);
    _drawWaveGroup(canvas, size, paint,
        waveOffset: 0.8, waveHeight: 0.10, speedMulti: 1.2, lines: 5);
  }

  void _drawWaveGroup(Canvas canvas, Size size, Paint paint,
      {required double waveOffset,
      required double waveHeight,
      required double speedMulti,
      required int lines}) {
    for (int i = 0; i < lines; i++) {
      final path = Path();
      final baseY = size.height * waveOffset + (i * 25);
      path.moveTo(0, baseY);
      for (double x = 0; x <= size.width; x += 5) {
        path.lineTo(
            x,
            baseY +
                math.sin((x * (0.002 + (i * 0.0002))) +
                        ((time * math.pi * 2 * speedMulti) + (i * 0.4))) *
                    (size.height * waveHeight + (i * 5)));
      }
      paint.maskFilter = MaskFilter.blur(BlurStyle.solid, 1.5 + (i * 0.5));
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _FloatingLinesPainter oldDelegate) =>
      oldDelegate.time != time || oldDelegate.isDark != isDark;
}

class DarkVeilBackground extends StatefulWidget {
  final Widget child;
  final bool isLight;
  const DarkVeilBackground(
      {super.key, required this.child, this.isLight = false});

  @override
  State<DarkVeilBackground> createState() => _DarkVeilBackgroundState();
}

class _DarkVeilBackgroundState extends State<DarkVeilBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller =
        AnimationController(vsync: this, duration: const Duration(seconds: 12))
          ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      color: isDark
          ? (widget.isLight
              ? const Color(0xFF1A1C29)
              : const Color(0xFF0D0E15))
          : const Color(0xFFF0F4F8),
      child: widget.child,
    );
  }
}

class _DarkVeilPainter extends CustomPainter {
  final double time;
  final bool isDark;
  _DarkVeilPainter(this.time, this.isDark);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..maskFilter = MaskFilter.blur(BlurStyle.normal, 120);

    double x1 = size.width * (0.5 + 0.4 * math.sin(time * 0.7));
    double y1 = size.height * (0.5 + 0.3 * math.cos(time * 0.5));
    paint.color = const Color(0xFF2F4BA2).withOpacity(isDark ? 0.4 : 0.2);
    canvas.drawCircle(Offset(x1, y1), size.width * 0.6, paint);

    double x2 = size.width * (0.5 + 0.3 * math.cos(time * 0.4));
    double y2 = size.height * (0.5 + 0.4 * math.sin(time * 0.6));
    paint.color = const Color(0xFFE947F5).withOpacity(isDark ? 0.2 : 0.15);
    canvas.drawCircle(Offset(x2, y2), size.width * 0.5, paint);
  }

  @override
  bool shouldRepaint(covariant _DarkVeilPainter oldDelegate) =>
      oldDelegate.time != time || oldDelegate.isDark != isDark;
}

// ----------------------------------------------------
// UPGRADED LIQUID GLASS SURFACE WIDGET
// ----------------------------------------------------
class GlassSurface extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;

  const GlassSurface({
    super.key,
    required this.child,
    this.borderRadius = 20,
    this.padding = EdgeInsets.zero,
    this.margin = EdgeInsets.zero,
  });

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: margin,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Container( // Removed BackdropFilter and Gradient for performance
          padding: padding,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A1C29) : Colors.white,
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: isDark
                  ? Colors.white.withOpacity(0.15)
                  : Colors.black.withOpacity(0.1),
              width: 1.0,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: child,
          ),
        ),
      ),
    );
  }
}

class ShinyHoverText extends StatefulWidget {
  final String text;
  final TextStyle style;

  const ShinyHoverText({super.key, required this.text, required this.style});

  @override
  State<ShinyHoverText> createState() => _ShinyHoverTextState();
}

class _ShinyHoverTextState extends State<ShinyHoverText>
    with SingleTickerProviderStateMixin {
  late AnimationController _shinyController;
  bool _isHovered = false;

  @override
  void initState() {
    super.initState();
    _shinyController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200));
  }

  @override
  void dispose() {
    _shinyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) {
        setState(() => _isHovered = true);
        _shinyController.repeat();
      },
      onExit: (_) {
        setState(() => _isHovered = false);
        _shinyController.stop();
        _shinyController.reset();
      },
      child: AnimatedBuilder(
        animation: _shinyController,
        builder: (context, child) {
          return ShaderMask(
            blendMode: BlendMode.srcIn,
            shaderCallback: (bounds) {
              if (!_isHovered)
                return LinearGradient(colors: [
                  widget.style.color ?? Colors.white,
                  widget.style.color ?? Colors.white
                ]).createShader(bounds);
              return LinearGradient(
                colors: [
                  widget.style.color ?? Colors.white,
                  Colors.white,
                  widget.style.color ?? Colors.white
                ],
                stops: const [0.0, 0.5, 1.0],
                begin: Alignment(-2.0 + (_shinyController.value * 4), 0),
                end: Alignment(0.0 + (_shinyController.value * 4), 0),
              ).createShader(bounds);
            },
            child: Text(widget.text, style: widget.style),
          );
        },
      ),
    );
  }
}

// ==========================================
// 3. SPLASH & LOGIN SCREENS
// ==========================================
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _entranceController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _entranceController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1500));
    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
        CurvedAnimation(parent: _entranceController, curve: Curves.elasticOut));
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(parent: _entranceController, curve: Curves.easeIn));

    _entranceController.forward();

    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) {
        Navigator.pushReplacement(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) =>
                const ProfileLoginScreen(),
            transitionsBuilder:
                (context, animation, secondaryAnimation, child) =>
                    FadeTransition(opacity: animation, child: child),
            transitionDuration: const Duration(milliseconds: 800),
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _entranceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF09090E) : const Color(0xFFF0F4F8),
      body: Center(
        child: AnimatedBuilder(
          animation: _entranceController,
          builder: (context, child) {
            return FadeTransition(
              opacity: _fadeAnimation,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CubeFoldingLogo(size: 100),
                    const SizedBox(height: 24),
                    Text("PEERSPACE",
                        style: TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2,
                            color: Theme.of(context).colorScheme.primary)),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class ProfileLoginScreen extends StatefulWidget {
  const ProfileLoginScreen({super.key});

  @override
  State<ProfileLoginScreen> createState() => _ProfileLoginScreenState();
}

class _ProfileLoginScreenState extends State<ProfileLoginScreen> {
  bool _otpSent = false;
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _otpController = TextEditingController();
  String _selectedLanguage = 'English';
  String _selectedCountry = 'India';

  void _requestOTP() {
    if (_phoneController.text.isEmpty) {
      showGlassSnackBar(context, "Please enter your phone number.",
          Icons.error_outline, Colors.redAccent);
      return;
    }
    setState(() => _otpSent = true);
    showGlassSnackBar(context, "Secure OTP sent to ${_phoneController.text}",
        Icons.mark_email_read_outlined, Theme.of(context).colorScheme.primary);
  }

  void _verifyLogin() {
    globalPhoneNumber = _phoneController.text;
    Navigator.pushReplacement(context,
        MaterialPageRoute(builder: (context) => const SetupProfileScreen()));
  }

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    Color textColor = isDark ? Colors.white : Colors.black87;

    return Scaffold(
      body: Container( // Removed FloatingLinesBackground for lag optimization
        color: isDark ? const Color(0xFF0D0E15) : const Color(0xFFF0F4F8),
        child: SafeArea(
          child: SingleChildScrollView(
            padding:
                const EdgeInsets.symmetric(horizontal: 32.0, vertical: 60.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Center(child: CubeFoldingLogo(size: 80)),
                const SizedBox(height: 32),
                ShinyHoverText(
                  text: "PEERSPACE",
                  style: TextStyle(
                      fontSize: 42,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.5,
                      color: Theme.of(context).colorScheme.primary),
                ),
                const SizedBox(height: 8),
                Text("AI-Powered Communities.",
                    style: TextStyle(
                        fontSize: 18,
                        color: isDark ? Colors.white70 : Colors.black54)),
                const SizedBox(height: 40),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedLanguage,
                        dropdownColor:
                            isDark ? const Color(0xFF161824) : Colors.white,
                        style: TextStyle(color: textColor),
                        decoration: _inputDecoration("Language", isDark),
                        items: ['English', 'Spanish', 'French', 'Hindi']
                            .map((String val) =>
                                DropdownMenuItem(value: val, child: Text(val)))
                            .toList(),
                        onChanged: (val) =>
                            setState(() => _selectedLanguage = val!),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedCountry,
                        dropdownColor:
                            isDark ? const Color(0xFF161824) : Colors.white,
                        style: TextStyle(color: textColor),
                        decoration: _inputDecoration("Country", isDark),
                        items: ['India', 'USA', 'UK', 'Canada']
                            .map((String val) =>
                                DropdownMenuItem(value: val, child: Text(val)))
                            .toList(),
                        onChanged: (val) =>
                            setState(() => _selectedCountry = val!),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  style: TextStyle(color: textColor),
                  decoration: _inputDecoration("Phone Number", isDark).copyWith(
                      prefixIcon: Icon(Icons.phone,
                          color: Theme.of(context).colorScheme.primary)),
                ),
                const SizedBox(height: 24),
                if (_otpSent) ...[
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    style: TextStyle(color: textColor),
                    decoration: _inputDecoration("Enter 6-digit OTP", isDark)
                        .copyWith(
                            prefixIcon: Icon(Icons.lock_outline,
                                color:
                                    Theme.of(context).colorScheme.secondary)),
                  ),
                  const SizedBox(height: 32),
                ],
                AnimatedPress(
                  onTap: _otpSent ? _verifyLogin : _requestOTP,
                  child: Container(
                    width: double.infinity,
                    height: 55,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.secondary,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                            color: Theme.of(context)
                                .colorScheme
                                .secondary
                                .withOpacity(0.5),
                            blurRadius: 10,
                            spreadRadius: 1)
                      ],
                    ),
                    child: Center(
                      child: Text(_otpSent ? 'Login' : 'Request Code',
                          style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1,
                              color: Colors.white)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, bool isDark) {
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(color: isDark ? Colors.white54 : Colors.black54),
      filled: true,
      fillColor: isDark
          ? Colors.white.withOpacity(0.05)
          : Colors.black.withOpacity(0.05),
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary)),
    );
  }
}

// ==========================================
// 3.5 SETUP PROFILE SCREEN (ONBOARDING)
// ==========================================

class SetupProfileScreen extends StatefulWidget {
  const SetupProfileScreen({super.key});

  @override
  State<SetupProfileScreen> createState() => _SetupProfileScreenState();
}

class _SetupProfileScreenState extends State<SetupProfileScreen> {
  final TextEditingController _nameController = TextEditingController();

  Future<void> _pickProfileImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      final bytes = await image.readAsBytes();
      setState(() {
        globalProfileImageBytes = bytes;
      });
    }
  }

  void _finishSetup() {
    if (_nameController.text.trim().isNotEmpty) {
      globalUsername = _nameController.text.trim();
    } else {
      globalUsername = "Anonymous Learner";
    }
    Navigator.pushReplacement(context,
        MaterialPageRoute(builder: (context) => const ChatRoomsScreen()));
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: FloatingLinesBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding:
                  const EdgeInsets.symmetric(horizontal: 32.0, vertical: 40.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Set Up Your Profile",
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: isDark ? Colors.white : Colors.black,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    "Choose a name and an avatar for the community.",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 16,
                        color: isDark ? Colors.white70 : Colors.black54),
                  ),
                  const SizedBox(height: 48),
                  AnimatedPress(
                    onTap: _pickProfileImage,
                    child: Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color:
                                isDark ? const Color(0xFF161824) : Colors.white,
                            border: Border.all(
                                color: const Color(0xFFE947F5).withOpacity(0.5),
                                width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFE947F5).withOpacity(0.2),
                                blurRadius: 30,
                                spreadRadius: 5,
                              )
                            ],
                            image: globalProfileImageBytes != null
                                ? DecorationImage(
                                    image:
                                        MemoryImage(globalProfileImageBytes!),
                                    fit: BoxFit.cover,
                                  )
                                : DecorationImage(
                                    image: NetworkImage(globalProfilePicture),
                                    fit: BoxFit.cover,
                                  ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF2F4BA2),
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: isDark
                                    ? const Color(0xFF0D0E15)
                                    : Colors.white,
                                width: 3),
                          ),
                          child: const Icon(Icons.camera_alt,
                              color: Colors.white, size: 20),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                  TextField(
                    controller: _nameController,
                    style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                        fontSize: 18),
                    textAlign: TextAlign.center,
                    decoration: InputDecoration(
                      hintText: "Enter your display name",
                      hintStyle: TextStyle(
                          color: isDark ? Colors.white38 : Colors.black38),
                      filled: true,
                      fillColor: isDark
                          ? Colors.white.withOpacity(0.05)
                          : Colors.black.withOpacity(0.05),
                      contentPadding: const EdgeInsets.symmetric(vertical: 20),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(
                            color: Color(0xFFE947F5), width: 1.5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                  AnimatedPress(
                    onTap: _finishSetup,
                    child: Container(
                      width: double.infinity,
                      height: 55,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE947F5),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                              color: const Color(0xFFE947F5).withOpacity(0.5),
                              blurRadius: 10,
                              spreadRadius: 1)
                        ],
                      ),
                      child: const Center(
                        child: Text(
                          'Get Started',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1,
                              color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 4. MAIN CHAT ROOMS SCREEN
// ==========================================

class ChatRoomsScreen extends StatefulWidget {
  const ChatRoomsScreen({super.key});

  @override
  State<ChatRoomsScreen> createState() => _ChatRoomsScreenState();
}

class _ChatRoomsScreenState extends State<ChatRoomsScreen> {
  final List<Map<String, dynamic>> _rooms = [
    {
      "title": "System Architecture",
      "msg": "Let's review the PostgreSQL schema.",
      "time": "12:00 PM",
      "tags": ["Tech", "Study"],
      "aiEnabled": true,
      "rules": "No entertainment or sports.",
      "members": [],
      "messages": <Map<String, dynamic>>[]
    },
    {
      "title": "Global Events",
      "msg": "Crazy news from last night's rally.",
      "time": "10:45 AM",
      "tags": ["Politics", "Casual"],
      "aiEnabled": false,
      "rules": "Be respectful, debate allowed.",
      "members": [],
      "messages": <Map<String, dynamic>>[]
    },
  ];

  final List<String> _availableTags = [
    'Study',
    'Politics',
    'Tech',
    'Casual',
    'Entertainment'
  ];

  @override
  void initState() {
    super.initState();
    _rooms[0]["members"] = [
      {"name": globalUsername, "phone": globalPhoneNumber, "role": "Admin"},
      {"name": "Developer_X", "phone": "9998887776", "role": "Moderator"}
    ];
    _rooms[1]["members"] = [
      {"name": "NewsBot", "phone": "0000000000", "role": "Admin"},
      {"name": globalUsername, "phone": globalPhoneNumber, "role": "Member"}
    ];
  }

  void _showProfileMenu(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    showAnimatedDialog(
      context,
      Align(
        alignment: Alignment.topRight,
        child: Material(
          color: Colors.transparent,
          child: Container(
            margin: const EdgeInsets.only(top: 100, right: 16),
            width: 220,
            decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF161824).withOpacity(0.95)
                    : Colors.white.withOpacity(0.95),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: const Color(0xFF2F4BA2).withOpacity(0.3))),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.person_outline,
                      color: Color(0xFFE947F5)),
                  title: Text('View Profile',
                      style: TextStyle(
                          color: isDark ? Colors.white : Colors.black)),
                  onTap: () async {
                    Navigator.pop(context);
                    await Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (context) =>
                                const ProfilePictureScreen()));
                    setState(() {});
                  },
                ),
                Divider(
                    color: isDark ? Colors.white10 : Colors.black12, height: 1),
                ListTile(
                  leading: const Icon(Icons.settings_outlined,
                      color: Color(0xFF2F4BA2)),
                  title: Text('Settings',
                      style: TextStyle(
                          color: isDark ? Colors.white : Colors.black)),
                  onTap: () async {
                    Navigator.pop(context);
                    await Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (context) => const SettingsScreen()));
                    setState(() {});
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _createNewRoom() {
    final TextEditingController newRoomController = TextEditingController();
    final TextEditingController rulesController = TextEditingController();
    List<String> selectedTags = [];

    showAnimatedDialog(
      context,
      StatefulBuilder(builder: (context, setStateDialog) {
        bool isDark = Theme.of(context).brightness == Brightness.dark;
        return Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: GlassSurface(
            padding: const EdgeInsets.all(24),
            borderRadius: 24,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Create New Space",
                      style: TextStyle(
                          color: isDark ? Colors.white : Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 20)),
                  const SizedBox(height: 20),
                  TextField(
                    controller: newRoomController,
                    style:
                        TextStyle(color: isDark ? Colors.white : Colors.black),
                    decoration: InputDecoration(
                      hintText: "Enter space name...",
                      hintStyle: TextStyle(
                          color: isDark ? Colors.white38 : Colors.black38),
                      filled: true,
                      fillColor: isDark
                          ? Colors.white.withOpacity(0.05)
                          : Colors.black.withOpacity(0.05),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text("Select Topics (Tags):",
                      style: TextStyle(
                          color: isDark ? Colors.white70 : Colors.black54,
                          fontSize: 13)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8.0,
                    runSpacing: 8.0,
                    children: _availableTags.map((tag) {
                      final isSelected = selectedTags.contains(tag);
                      return FilterChip(
                        label: Text(tag,
                            style: TextStyle(
                                color: isSelected
                                    ? Colors.white
                                    : (isDark
                                        ? Colors.white70
                                        : Colors.black87),
                                fontSize: 12)),
                        selected: isSelected,
                        selectedColor: const Color(0xFFE947F5).withOpacity(0.6),
                        backgroundColor: isDark
                            ? Colors.white.withOpacity(0.05)
                            : Colors.black.withOpacity(0.05),
                        checkmarkColor: Colors.white,
                        onSelected: (bool selected) {
                          setStateDialog(() {
                            selected
                                ? selectedTags.add(tag)
                                : selectedTags.remove(tag);
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  Text("Custom AI Rules (Powered by Gemini):",
                      style: TextStyle(
                          color: isDark ? Colors.white70 : Colors.black54,
                          fontSize: 13)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: rulesController,
                    maxLines: 2,
                    style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                        fontSize: 14),
                    decoration: InputDecoration(
                      hintText:
                          "e.g., 'Block sports messages, focus on React...'",
                      hintStyle: TextStyle(
                          color: isDark ? Colors.white38 : Colors.black38,
                          fontSize: 12),
                      filled: true,
                      fillColor: isDark
                          ? Colors.white.withOpacity(0.05)
                          : Colors.black.withOpacity(0.05),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text("Cancel",
                            style: TextStyle(
                                color:
                                    isDark ? Colors.white54 : Colors.black54)),
                      ),
                      const SizedBox(width: 12),
                      AnimatedPress(
                        onTap: () {
                          if (newRoomController.text.trim().isNotEmpty) {
                            setState(() {
                              _rooms.insert(0, {
                                "title": newRoomController.text.trim(),
                                "msg": "Space created! Start chatting.",
                                "time": "Just now",
                                "tags": List<String>.from(selectedTags),
                                "aiEnabled": true,
                                "rules": rulesController.text.trim(),
                                "members": [
                                  {
                                    "name": globalUsername,
                                    "phone": globalPhoneNumber,
                                    "role": "Admin"
                                  }
                                ],
                                "messages": <Map<String, dynamic>>[]
                              });
                            });
                            Navigator.pop(context);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 24, vertical: 12),
                          decoration: BoxDecoration(
                              color: const Color(0xFFE947F5),
                              borderRadius: BorderRadius.circular(12)),
                          child: const Text("Create",
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  )
                ],
              ),
            ),
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: DarkVeilBackground(
        child: Stack(
          children: [
            ListView.builder(
              padding: const EdgeInsets.only(
                  top: 120, left: 16, right: 16, bottom: 100),
              itemCount: _rooms.length,
              itemBuilder: (context, index) {
                final room = _rooms[index];
                final accentColor = index % 2 == 0
                    ? const Color(0xFFE947F5)
                    : const Color(0xFF2F4BA2);
                return _chatTile(context, room, accentColor, isDark);
              },
            ),
            // PREMIUM TOP RECTANGLE BAR WITH TOGGLES
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16.0, vertical: 8.0),
                  child: GlassSurface(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 12),
                    borderRadius: 24,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const CubeFoldingLogo(size: 28),
                        const SizedBox(width: 8),
                        Text("Hi 👋",
                            style: TextStyle(
                                color: isDark ? Colors.white : Colors.black,
                                fontWeight: FontWeight.w800,
                                fontSize: 18)),
                        const Spacer(),
                        AnimatedPress(
                          onTap: () {
                            themeNotifier.value =
                                isDark ? ThemeMode.light : ThemeMode.dark;
                          },
                          child: Icon(
                              isDark ? Icons.light_mode : Icons.dark_mode,
                              color: isDark ? Colors.white : Colors.black,
                              size: 22),
                        ),
                        const SizedBox(width: 8),
                        Switch(
                            value: globalAiModerationEnabled,
                            activeColor: const Color(0xFF00E5FF),
                            activeTrackColor:
                                const Color(0xFF00E5FF).withOpacity(0.4),
                            onChanged: (val) {
                              setState(() => globalAiModerationEnabled = val);
                              showGlassSnackBar(
                                  context,
                                  val
                                      ? "Global AI Active"
                                      : "Global AI Disabled",
                                  Icons.shield,
                                  const Color(0xFF00E5FF));
                            }),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => _showProfileMenu(context),
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                      color: const Color(0xFF00E5FF)
                                          .withOpacity(0.8),
                                      blurRadius: 15,
                                      spreadRadius: 2),
                                ]),
                            child: CircleAvatar(
                              radius: 16,
                              backgroundColor: Colors.grey[800],
                              backgroundImage: globalProfileImageBytes != null
                                  ? MemoryImage(globalProfileImageBytes!)
                                  : NetworkImage(globalProfilePicture)
                                      as ImageProvider,
                            ),
                          ),
                        )
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 30,
              right: 20,
              child: AnimatedPress(
                onTap: _createNewRoom,
                child: GlassSurface(
                  borderRadius: 30,
                  padding: const EdgeInsets.all(16),
                  child: Icon(Icons.add,
                      color: isDark ? Colors.white : Colors.black, size: 28),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chatTile(BuildContext context, Map<String, dynamic> room,
      Color accentColor, bool isDark) {
    List<String> tags =
        (room["tags"] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
            [];

    List messages = room["messages"] ?? [];
    String previewMsg = room["msg"];
    String previewTime = room["time"];
    if (messages.isNotEmpty) {
      previewMsg = messages.last["text"];
      previewTime = messages.last["time"] ?? previewTime;
    }

    return GlassSurface(
      margin: const EdgeInsets.only(bottom: 16),
      padding: EdgeInsets.zero,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          splashColor: accentColor.withOpacity(0.3),
          highlightColor: accentColor.withOpacity(0.15),
          onTap: () async {
            final result = await Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => PeerspaceChatScreen(roomData: room)));

            // Remove the room if the user triggered the "Leave Group" action
            if (result == 'leave') {
              setState(() {
                _rooms.remove(room);
              });
            } else {
              setState(
                  () {}); // Refresh home screen to update latest message previews
            }
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              children: [
                Container(
                  width: 55,
                  height: 55,
                  decoration: BoxDecoration(
                      color: accentColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(16)),
                  child: Center(
                      child: Text(
                          room["title"].isNotEmpty
                              ? room["title"][0].toUpperCase()
                              : "?",
                          style: TextStyle(
                              color: accentColor,
                              fontSize: 24,
                              fontWeight: FontWeight.w900))),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(room["title"],
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                              color: isDark ? Colors.white : Colors.black)),
                      const SizedBox(height: 6),
                      Text(previewMsg,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              color: isDark ? Colors.white70 : Colors.black54,
                              fontSize: 14)),
                      if (tags.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Wrap(
                            spacing: 8,
                            children: tags
                                .map((t) => Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                          color: isDark
                                              ? Colors.white.withOpacity(0.1)
                                              : Colors.black.withOpacity(0.05),
                                          borderRadius:
                                              BorderRadius.circular(6)),
                                      child: Text(t,
                                          style: TextStyle(
                                              fontSize: 11,
                                              color: isDark
                                                  ? Colors.white
                                                  : Colors.black,
                                              fontWeight: FontWeight.w500)),
                                    ))
                                .toList())
                      ]
                    ],
                  ),
                ),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(previewTime,
                        style: TextStyle(
                            color: isDark ? Colors.white54 : Colors.black45,
                            fontSize: 12)),
                    if (room["aiEnabled"] == true)
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Icon(Icons.shield, color: accentColor, size: 14),
                      )
                  ],
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 5. INDIVIDUAL CHAT SCREEN
// ==========================================

class PeerspaceChatScreen extends StatefulWidget {
  final Map<String, dynamic> roomData;

  const PeerspaceChatScreen({super.key, required this.roomData});

  @override
  State<PeerspaceChatScreen> createState() => _PeerspaceChatScreenState();
}

class _PeerspaceChatScreenState extends State<PeerspaceChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  bool _isTyping = false;

  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    if (widget.roomData["messages"] == null) {
      widget.roomData["messages"] = <Map<String, dynamic>>[];
    }

    _controller.addListener(
        () => setState(() => _isTyping = _controller.text.isNotEmpty));

    _focusNode.onKeyEvent = (FocusNode node, KeyEvent event) {
      if (event is KeyDownEvent) {
        if (event.logicalKey == LogicalKeyboardKey.enter) {
          if (HardwareKeyboard.instance.isShiftPressed) {
            return KeyEventResult.ignored;
          } else {
            _handleSend();
            return KeyEventResult.handled;
          }
        }
      }
      return KeyEventResult.ignored;
    };
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    if (_isListening) _speech.stop();
    super.dispose();
  }

  void _listenForVoice() async {
    if (!_isListening) {
      bool available = await _speech.initialize();
      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
            onResult: (val) => setState(() {
                  _controller.text = val.recognizedWords;
                }));
      } else {
        showGlassSnackBar(context, "Voice recognition not available.",
            Icons.mic_off, Colors.redAccent);
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }

  Future<void> _handleSend() async {
    if (_controller.text.trim().isEmpty) return;
    String text = _controller.text.trim();
    String timeString = TimeOfDay.now().format(context);

    // 1. OPTIMISTIC UI: Immediately add message to chat to remove Perceived Lag
    Map<String, dynamic> optimisticMsg = {"text": text, "isMe": true, "time": timeString};
    setState(() {
      widget.roomData["messages"].add(optimisticMsg);
      widget.roomData["msg"] = text;
      widget.roomData["time"] = timeString;
    });

    // 2. Clear input fields immediately
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _controller.clear();
    });
    setState(() => _isTyping = false);
    
    if (_isListening) {
      _speech.stop();
      setState(() => _isListening = false);
    }
    
    _focusNode.requestFocus(); // Keep keyboard open for flow

    // 3. AI Checking Phase (Runs in background)
    try {
      List<String> tags = (widget.roomData["tags"] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [];
          
      String rules = widget.roomData["rules"]?.toString() ?? "";

      int mockUserId = 1;
      int mockGroupId = widget.roomData["id"] ?? 1;

      // PASS TAGS AND RULES to the FastAPI Backend!
      final result = await ApiService.sendChatMessage(
        mockUserId, mockGroupId, text,
        tags: tags, roomRules: rules
      );
      
      String actionStatus = result["action"] ?? "APPROVED";
      String aiFeedback = result["feedback"] ?? "Action blocked by admin rule.";

      // ONLY ENFORCE UI BLOCK IF AI IS ENABLED LOCALLY AND GLOBALLY
      if (widget.roomData["aiEnabled"] == true && globalAiModerationEnabled) {
        if (actionStatus == "BLOCKED" || actionStatus == "FLAGGED") {
          
          // Revert Optimistic UI Message
          setState(() {
            widget.roomData["messages"].remove(optimisticMsg);
            if (widget.roomData["messages"].isNotEmpty) {
              widget.roomData["msg"] = widget.roomData["messages"].last["text"];
              widget.roomData["time"] = widget.roomData["messages"].last["time"];
            } else {
              widget.roomData["msg"] = "No messages yet";
              widget.roomData["time"] = "";
            }
          });

          showGlassSnackBar(
              context,
              "this message not for this group",
              Icons.warning_amber_rounded,
              const Color(0xFFE947F5));
        }
      }
    } catch (e) {
      print("Moderation API Error: $e");
      // FAIL-CLOSED: If AI is enabled and the server is unreachable, block the message
      if (widget.roomData["aiEnabled"] == true && globalAiModerationEnabled) {
        setState(() {
          widget.roomData["messages"].remove(optimisticMsg);
          if (widget.roomData["messages"].isNotEmpty) {
            widget.roomData["msg"] = widget.roomData["messages"].last["text"];
            widget.roomData["time"] = widget.roomData["messages"].last["time"];
          } else {
            widget.roomData["msg"] = "No messages yet";
            widget.roomData["time"] = "";
          }
        });
        showGlassSnackBar(
            context,
            "Cannot verify message — moderation server unreachable",
            Icons.wifi_off_rounded,
            Colors.orangeAccent);
      }
    }
  }

  void _addMemberDirectly() {
    TextEditingController phoneController = TextEditingController();
    bool isDark = Theme.of(context).brightness == Brightness.dark;

    showAnimatedDialog(
        context,
        AlertDialog(
          backgroundColor: isDark ? const Color(0xFF161824) : Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text("Add Member",
              style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                  fontWeight: FontWeight.bold)),
          content: TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              style: TextStyle(color: isDark ? Colors.white : Colors.black),
              decoration: InputDecoration(
                  hintText: "Enter phone number",
                  hintStyle: TextStyle(
                      color: isDark ? Colors.white54 : Colors.black54),
                  filled: true,
                  fillColor: isDark
                      ? Colors.white.withOpacity(0.05)
                      : Colors.black.withOpacity(0.05),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none))),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text("Cancel",
                    style: TextStyle(
                        color: isDark ? Colors.white54 : Colors.black54))),
            AnimatedPress(
              onTap: () {
                if (phoneController.text.isNotEmpty) {
                  setState(() {
                    widget.roomData["members"].add({
                      "name":
                          "New User (${phoneController.text.substring(math.max(0, phoneController.text.length - 4))})",
                      "phone": phoneController.text,
                      "role": "Member"
                    });
                  });
                  Navigator.pop(context);
                }
              },
              child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary,
                      borderRadius: BorderRadius.circular(8)),
                  child: const Text("Add",
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold))),
            )
          ],
        ));
  }

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    List<String> tags = (widget.roomData["tags"] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [];
    List<Map<String, dynamic>> messages = widget.roomData["messages"] ?? [];
    List members = widget.roomData["members"] ?? [];

    bool showAddMemberPrompt = members.length < 2 && messages.isEmpty;

    return Scaffold(
      appBar: AppBar(
          backgroundColor: isDark
              ? const Color(0xFF161824).withOpacity(0.95)
              : Colors.white.withOpacity(0.95),
          elevation: 1,
          title: GestureDetector(
            onTap: () async {
              final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) =>
                          GroupInfoScreen(roomData: widget.roomData)));

              if (result == 'leave') {
                Navigator.pop(context,
                    'leave'); // Pass the leave request back up to ChatRoomsScreen
              } else {
                setState(() {});
              }
            },
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(widget.roomData["title"],
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black)),
                    const SizedBox(width: 8),
                    Icon(Icons.info_outline,
                        size: 14,
                        color: isDark ? Colors.white54 : Colors.black54)
                  ],
                ),
                if (tags.isNotEmpty)
                  Text("Tap for Group Info • Tags: ${tags.join(', ')}",
                      style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.white54 : Colors.black54)),
              ],
            ),
          )),
      body: DarkVeilBackground(
        child: Column(
          children: [
            Expanded(
              child: showAddMemberPrompt
                  ? Center(
                      child: AnimatedPress(
                        onTap: _addMemberDirectly,
                        child: GlassSurface(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 40, vertical: 30),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.group_add,
                                    size: 48,
                                    color:
                                        Theme.of(context).colorScheme.primary),
                                const SizedBox(height: 16),
                                Text("It's quiet here.",
                                    style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: isDark
                                            ? Colors.white
                                            : Colors.black)),
                                const SizedBox(height: 8),
                                Text("Add members to start chatting!",
                                    style: TextStyle(
                                        color: isDark
                                            ? Colors.white70
                                            : Colors.black54)),
                              ],
                            )),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        final msg = messages[index];
                        return Align(
                          alignment: msg["isMe"]
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: GlassSurface(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(msg["text"],
                                      style: TextStyle(
                                          color: isDark
                                              ? Colors.white
                                              : Colors.black,
                                          fontSize: 16)),
                                  const SizedBox(height: 4),
                                  Text(msg["time"] ?? "",
                                      style: TextStyle(
                                          color: isDark
                                              ? Colors.white38
                                              : Colors.black38,
                                          fontSize: 10)),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF161824).withOpacity(0.85)
                    : Colors.white.withOpacity(0.85),
                border: Border(
                    top: BorderSide(
                        color: isDark ? Colors.white10 : Colors.black12)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      focusNode: _focusNode,
                      minLines: 1,
                      maxLines: 5,
                      textInputAction: TextInputAction.newline,
                      style: TextStyle(
                          color: isDark ? Colors.white : Colors.black,
                          fontSize: 15),
                      decoration: InputDecoration(
                        hintText: "Message ${widget.roomData['title']}...",
                        hintStyle: TextStyle(
                            color: isDark ? Colors.white38 : Colors.black38),
                        filled: true,
                        fillColor: isDark
                            ? Colors.white.withOpacity(0.03)
                            : Colors.black.withOpacity(0.03),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 14),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide.none),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  AnimatedPress(
                    onTap: _listenForVoice,
                    child: Container(
                      width: 48,
                      height: 48,
                      margin: const EdgeInsets.only(bottom: 2),
                      decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _isListening
                              ? Colors.redAccent
                              : (isDark
                                  ? Colors.white.withOpacity(0.1)
                                  : Colors.black.withOpacity(0.05))),
                      child: Icon(_isListening ? Icons.mic : Icons.mic_none,
                          color: isDark ? Colors.white : Colors.black,
                          size: 20),
                    ),
                  ),
                  const SizedBox(width: 8),
                  AnimatedPress(
                    onTap: _handleSend,
                    child: Container(
                      width: 48,
                      height: 48,
                      margin: const EdgeInsets.only(bottom: 2),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isTyping
                            ? Theme.of(context).colorScheme.primary
                            : (isDark
                                ? Colors.white.withOpacity(0.1)
                                : Colors.black.withOpacity(0.05)),
                        boxShadow: _isTyping
                            ? [
                                BoxShadow(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .primary
                                        .withOpacity(0.4),
                                    blurRadius: 10,
                                    spreadRadius: 2)
                              ]
                            : null,
                      ),
                      child: Icon(Icons.send,
                          color: _isTyping
                              ? Colors.white
                              : (isDark ? Colors.white54 : Colors.black54),
                          size: 20),
                    ),
                  ),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 5.1 GROUP INFO / MEMBER MANAGEMENT
// ==========================================
class GroupInfoScreen extends StatefulWidget {
  final Map<String, dynamic> roomData;
  const GroupInfoScreen({super.key, required this.roomData});

  @override
  State<GroupInfoScreen> createState() => _GroupInfoScreenState();
}

class _GroupInfoScreenState extends State<GroupInfoScreen> {
  void _addMember() {
    TextEditingController phoneController = TextEditingController();
    bool isDark = Theme.of(context).brightness == Brightness.dark;

    showAnimatedDialog(
        context,
        AlertDialog(
          backgroundColor: isDark ? const Color(0xFF161824) : Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text("Add Member",
              style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                  fontWeight: FontWeight.bold)),
          content: TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              style: TextStyle(color: isDark ? Colors.white : Colors.black),
              decoration: InputDecoration(
                  hintText: "Enter phone number",
                  hintStyle: TextStyle(
                      color: isDark ? Colors.white54 : Colors.black54),
                  filled: true,
                  fillColor: isDark
                      ? Colors.white.withOpacity(0.05)
                      : Colors.black.withOpacity(0.05),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none))),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text("Cancel",
                    style: TextStyle(
                        color: isDark ? Colors.white54 : Colors.black54))),
            AnimatedPress(
              onTap: () {
                if (phoneController.text.isNotEmpty) {
                  setState(() => widget.roomData["members"].add({
                        "name":
                            "New User (${phoneController.text.substring(math.max(0, phoneController.text.length - 4))})",
                        "phone": phoneController.text,
                        "role": "Member"
                      }));
                  Navigator.pop(context);
                }
              },
              child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary,
                      borderRadius: BorderRadius.circular(8)),
                  child: const Text("Add",
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold))),
            )
          ],
        ));
  }

  void _editRules() {
    TextEditingController rulesController =
        TextEditingController(text: widget.roomData["rules"]);
    bool isDark = Theme.of(context).brightness == Brightness.dark;

    showAnimatedDialog(
        context,
        AlertDialog(
            backgroundColor: isDark ? const Color(0xFF161824) : Colors.white,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Text("Edit AI Rules",
                style: TextStyle(
                    color: isDark ? Colors.white : Colors.black,
                    fontWeight: FontWeight.bold)),
            content: TextField(
              controller: rulesController,
              maxLines: 3,
              style: TextStyle(color: isDark ? Colors.white : Colors.black),
              decoration: InputDecoration(
                  hintText: "Enter new AI moderation rules...",
                  filled: true,
                  fillColor: isDark
                      ? Colors.white.withOpacity(0.05)
                      : Colors.black.withOpacity(0.05),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none)),
            ),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text("Cancel",
                      style: TextStyle(
                          color: isDark ? Colors.white54 : Colors.black54))),
              AnimatedPress(
                  onTap: () {
                    setState(() =>
                        widget.roomData["rules"] = rulesController.text.trim());
                    Navigator.pop(context);
                  },
                  child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary,
                          borderRadius: BorderRadius.circular(8)),
                      child: const Text("Save",
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold))))
            ]));
  }

  void _manageUser(int index) {
    var member = widget.roomData["members"][index];
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    bool isMe = member['phone'] == globalPhoneNumber ||
        member['name'] == globalUsername;

    showAnimatedDialog(
        context,
        AlertDialog(
          backgroundColor: isDark ? const Color(0xFF161824) : Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(isMe ? "Manage Yourself" : "Manage ${member['name']}",
              style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                  fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isMe)
                ListTile(
                  leading: Icon(Icons.admin_panel_settings,
                      color: Theme.of(context).colorScheme.primary),
                  title: Text("Make Moderator",
                      style: TextStyle(
                          color: isDark ? Colors.white : Colors.black)),
                  onTap: () {
                    setState(() => member['role'] = "Moderator");
                    Navigator.pop(context);
                  },
                ),
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.redAccent),
                title: Text(isMe ? "Leave Space" : "Remove Member",
                    style: const TextStyle(color: Colors.redAccent)),
                onTap: () {
                  if (isMe) {
                    Navigator.pop(context); // Close dialog
                    Navigator.pop(context,
                        'leave'); // Send signal to delete room and exit
                  } else {
                    setState(() => widget.roomData["members"].removeAt(index));
                    Navigator.pop(context);
                  }
                },
              )
            ],
          ),
        ));
  }

  @override
  Widget build(BuildContext context) {
    List members = widget.roomData["members"] ?? [];
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    String customRules = widget.roomData["rules"] ?? "None defined.";

    return Scaffold(
      appBar: AppBar(
          backgroundColor: isDark ? const Color(0xFF161824) : Colors.white,
          title: Text("Group Info",
              style: TextStyle(color: isDark ? Colors.white : Colors.black))),
      body: DarkVeilBackground(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            GlassSurface(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("Group AI Moderation",
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color:
                                        isDark ? Colors.white : Colors.black)),
                            const SizedBox(height: 4),
                            Text(
                                "Filter off-topic & abusive messages for this specific group based on its tags.",
                                style: TextStyle(
                                    color: isDark
                                        ? Colors.white54
                                        : Colors.black54,
                                    fontSize: 13)),
                          ],
                        ),
                      ),
                      Switch(
                        activeColor: Theme.of(context).colorScheme.primary,
                        activeTrackColor: Theme.of(context)
                            .colorScheme
                            .primary
                            .withOpacity(0.4),
                        value: widget.roomData["aiEnabled"] ?? false,
                        onChanged: (val) =>
                            setState(() => widget.roomData["aiEnabled"] = val),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Divider(
                      color: isDark ? Colors.white10 : Colors.black12,
                      height: 1),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Custom AI Rules (Gemini):",
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : Colors.black)),
                      AnimatedPress(
                          onTap: _editRules,
                          child: Icon(Icons.edit,
                              size: 16,
                              color: isDark ? Colors.white54 : Colors.black54))
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(customRules,
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontStyle: FontStyle.italic)),
                ],
              ),
            ),
            const SizedBox(height: 30),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Members",
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold)),
                AnimatedPress(
                    onTap: _addMember,
                    child: Icon(Icons.person_add,
                        color: isDark ? Colors.white : Colors.black))
              ],
            ),
            const SizedBox(height: 10),
            ...List.generate(members.length, (index) {
              return GlassSurface(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(4),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => _manageUser(index),
                    child: ListTile(
                      leading: CircleAvatar(
                          backgroundColor:
                              isDark ? Colors.white10 : Colors.black12,
                          child: Text(members[index]["name"][0])),
                      title: Text(members[index]["name"],
                          style: TextStyle(
                              color: isDark ? Colors.white : Colors.black,
                              fontWeight: FontWeight.bold)),
                      subtitle: Text(
                          members[index]["phone"] ?? "Unknown Number",
                          style: TextStyle(
                              color: isDark ? Colors.white54 : Colors.black54)),
                      trailing: Text(members[index]["role"],
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: members[index]["role"] == "Admin" ||
                                      members[index]["role"] == "Moderator"
                                  ? Theme.of(context).colorScheme.primary
                                  : (isDark
                                      ? Colors.white54
                                      : Colors.black54))),
                    ),
                  ),
                ),
              );
            }),
            const SizedBox(height: 30),
            // LEAVE SPACE BUTTON
            AnimatedPress(
                onTap: () {
                  Navigator.pop(context, 'leave'); // Propagate 'leave' upward
                },
                child: GlassSurface(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.exit_to_app, color: Colors.redAccent),
                        SizedBox(width: 8),
                        Text("Leave Space",
                            style: TextStyle(
                                color: Colors.redAccent,
                                fontWeight: FontWeight.bold,
                                fontSize: 16)),
                      ],
                    )))
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 6. TILTED PROFILE PICTURE SCREEN
// ==========================================

class ProfilePictureScreen extends StatefulWidget {
  const ProfilePictureScreen({super.key});

  @override
  State<ProfilePictureScreen> createState() => _ProfilePictureScreenState();
}

class _ProfilePictureScreenState extends State<ProfilePictureScreen>
    with SingleTickerProviderStateMixin {
  double xRotation = 0;
  double yRotation = 0;
  late AnimationController _springController;
  late Animation<double> _xAnim;
  late Animation<double> _yAnim;

  @override
  void initState() {
    super.initState();
    _springController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 500));
    _springController.addListener(() {
      setState(() {
        xRotation = _xAnim.value;
        yRotation = _yAnim.value;
      });
    });
  }

  Future<void> _pickProfileImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      final bytes = await image.readAsBytes();
      setState(() {
        globalProfileImageBytes = bytes;
      });
    }
  }

  void _editProfile() {
    TextEditingController nameController =
        TextEditingController(text: globalUsername);
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    showAnimatedDialog(
        context,
        AlertDialog(
          backgroundColor: isDark ? const Color(0xFF161824) : Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text("Edit Profile",
              style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                  fontWeight: FontWeight.bold)),
          content: TextField(
            controller: nameController,
            style: TextStyle(color: isDark ? Colors.white : Colors.black),
            decoration: InputDecoration(
                labelText: "Username",
                labelStyle:
                    TextStyle(color: isDark ? Colors.white54 : Colors.black54),
                filled: true,
                fillColor: isDark
                    ? Colors.white.withOpacity(0.05)
                    : Colors.black.withOpacity(0.05),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none)),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text("Cancel",
                    style: TextStyle(
                        color: isDark ? Colors.white54 : Colors.black54))),
            AnimatedPress(
              onTap: () {
                setState(() => globalUsername = nameController.text);
                Navigator.pop(context);
              },
              child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary,
                      borderRadius: BorderRadius.circular(8)),
                  child: const Text("Save",
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold))),
            ),
          ],
        ));
  }

  void _onPanUpdate(DragUpdateDetails details, BoxConstraints constraints) {
    if (_springController.isAnimating) _springController.stop();
    double rotateAmplitude = 12.0 * (math.pi / 180.0);
    setState(() {
      xRotation = (details.localPosition.dy - 125) / 125 * -rotateAmplitude;
      yRotation = (details.localPosition.dx - 125) / 125 * rotateAmplitude;
    });
  }

  void _onPanEnd(DragEndDetails details) {
    _xAnim = Tween<double>(begin: xRotation, end: 0).animate(
        CurvedAnimation(parent: _springController, curve: Curves.elasticOut));
    _yAnim = Tween<double>(begin: yRotation, end: 0).animate(
        CurvedAnimation(parent: _springController, curve: Curves.elasticOut));
    _springController.forward(from: 0);
  }

  @override
  void dispose() {
    _springController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text("Profile Details",
              style: TextStyle(
                  fontSize: 16, color: isDark ? Colors.white : Colors.black))),
      body: DarkVeilBackground(
        isLight: true,
        child: Center(
          child: SingleChildScrollView(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                LayoutBuilder(builder: (context, constraints) {
                  return GestureDetector(
                    onPanUpdate: (details) =>
                        _onPanUpdate(details, constraints),
                    onPanEnd: _onPanEnd,
                    child: Transform(
                      alignment: FractionalOffset.center,
                      transform: Matrix4.identity()
                        ..setEntry(3, 2, 0.001)
                        ..rotateX(xRotation)
                        ..rotateY(yRotation),
                      child: Container(
                        width: 250,
                        height: 250,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                                color: const Color(0xFF00E5FF).withOpacity(0.5),
                                blurRadius: 40,
                                spreadRadius: 2)
                          ],
                          image: DecorationImage(
                            image: globalProfileImageBytes != null
                                ? MemoryImage(globalProfileImageBytes!)
                                : NetworkImage(globalProfilePicture)
                                    as ImageProvider,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 30),
                AnimatedPress(
                  onTap: _editProfile,
                  child: GlassSurface(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 12),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(globalUsername,
                            style: TextStyle(
                                color: isDark ? Colors.white : Colors.black,
                                fontSize: 22,
                                fontWeight: FontWeight.bold)),
                        const SizedBox(width: 12),
                        Icon(Icons.edit,
                            size: 18,
                            color: isDark ? Colors.white54 : Colors.black54)
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 40),
                AnimatedPress(
                  onTap: _pickProfileImage,
                  child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 16),
                      decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.secondary,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                                color: Theme.of(context)
                                    .colorScheme
                                    .secondary
                                    .withOpacity(0.5),
                                blurRadius: 15,
                                offset: const Offset(0, 5))
                          ]),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(Icons.upload_file, color: Colors.white),
                          SizedBox(width: 8),
                          Text("Upload from PC/Mobile",
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold)),
                        ],
                      )),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 7. SETTINGS SCREEN
// ==========================================

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text("Settings",
              style: TextStyle(
                  fontSize: 16, color: isDark ? Colors.white : Colors.black))),
      body: DarkVeilBackground(
        isLight: true,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            GlassSurface(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Global AI Moderation",
                            style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : Colors.black)),
                        const SizedBox(height: 4),
                        Text("Pre-validate messages before posting.",
                            style: TextStyle(
                                color: isDark ? Colors.white54 : Colors.black54,
                                fontSize: 13)),
                      ],
                    ),
                  ),
                  Switch(
                      activeColor: const Color(0xFF00E5FF),
                      activeTrackColor:
                          const Color(0xFF00E5FF).withOpacity(0.4),
                      value: globalAiModerationEnabled,
                      onChanged: (val) {
                        setState(() => globalAiModerationEnabled = val);
                        showGlassSnackBar(
                            context,
                            val ? "Global AI Active" : "Global AI Disabled",
                            Icons.shield,
                            const Color(0xFF00E5FF));
                      }),
                ],
              ),
            ),
            const SizedBox(height: 32),
            _settingsItem(
                Icons.lock_outline,
                "Privacy & Security",
                const Color(0xFF2F4BA2),
                () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const PrivacySecurityScreen()))),
            _settingsItem(
                Icons.notifications_none,
                "Notifications",
                Theme.of(context).colorScheme.primary,
                () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const NotificationsScreen()))),
            _settingsItem(
                Icons.admin_panel_settings,
                "Admin Panel",
                Theme.of(context).colorScheme.primary,
                () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const AdminPanelScreen()))),
          ],
        ),
      ),
    );
  }

  Widget _settingsItem(
      IconData icon, String title, Color accent, VoidCallback onTap) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return AnimatedPress(
      onTap: onTap,
      child: GlassSurface(
        margin: const EdgeInsets.only(bottom: 12.0),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: accent, size: 22),
            const SizedBox(width: 16),
            Expanded(
                child: Text(title,
                    style: TextStyle(
                        fontSize: 15,
                        color: isDark ? Colors.white : Colors.black,
                        fontWeight: FontWeight.bold))),
            Icon(Icons.arrow_forward_ios,
                size: 14, color: isDark ? Colors.white70 : Colors.black54),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 8. NOTIFICATIONS SCREEN
// ==========================================
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  final List<Map<String, String>> _notifications = const [
    {
      "title": "New Space Created",
      "body": "You successfully created 'System Architecture'.",
      "time": "2 hours ago"
    },
    {
      "title": "AI Moderation Alert",
      "body": "A message was flagged and blocked in 'Global Events'.",
      "time": "5 hours ago"
    },
    {
      "title": "Welcome to PEERSPACE",
      "body": "Your account has been verified successfully.",
      "time": "1 day ago"
    },
  ];

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text("Notifications",
              style: TextStyle(
                  fontSize: 16, color: isDark ? Colors.white : Colors.black))),
      body: DarkVeilBackground(
        isLight: true,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _notifications.length,
          itemBuilder: (context, index) {
            final notif = _notifications[index];
            return GlassSurface(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(notif["title"]!,
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : Colors.black)),
                      Text(notif["time"]!,
                          style: TextStyle(
                              color: isDark ? Colors.white70 : Colors.black54,
                              fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(notif["body"]!,
                      style: TextStyle(
                          color: isDark ? Colors.white70 : Colors.black87,
                          fontSize: 14)),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

// ==========================================
// 9. PRIVACY & SECURITY SCREEN
// ==========================================
class PrivacySecurityScreen extends StatefulWidget {
  const PrivacySecurityScreen({super.key});

  @override
  State<PrivacySecurityScreen> createState() => _PrivacySecurityScreenState();
}

class _PrivacySecurityScreenState extends State<PrivacySecurityScreen> {
  bool _obscurePassword = true;
  final String _mockPassword = "Hackathon@VitChennai2026!";

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text("Privacy & Security",
              style: TextStyle(
                  fontSize: 16, color: isDark ? Colors.white : Colors.black))),
      body: DarkVeilBackground(
        isLight: true,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text("Account Security",
                style: TextStyle(
                    color: Color(0xFF2F4BA2), fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            GlassSurface(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                children: [
                  Icon(Icons.key,
                      color: isDark ? Colors.white70 : Colors.black54),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Password",
                            style: TextStyle(
                                color: isDark ? Colors.white70 : Colors.black54,
                                fontSize: 12)),
                        const SizedBox(height: 4),
                        Text(
                            _obscurePassword
                                ? "••••••••••••••••"
                                : _mockPassword,
                            style: TextStyle(
                                color: isDark ? Colors.white : Colors.black,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.2)),
                      ],
                    ),
                  ),
                  AnimatedPress(
                    onTap: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                    child: Icon(
                        _obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                        color: Theme.of(context).colorScheme.primary),
                  )
                ],
              ),
            ),
            const SizedBox(height: 32),
            Text("End-to-End Encrypted Chats",
                style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildEncryptedChatRow("System Architecture", isDark),
            _buildEncryptedChatRow("Global Events", isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildEncryptedChatRow(String roomName, bool isDark) {
    return GlassSurface(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(Icons.lock,
              color: Theme.of(context).colorScheme.primary, size: 16),
          const SizedBox(width: 12),
          Text(roomName,
              style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                  fontWeight: FontWeight.bold)),
          const Spacer(),
          const Text("Secured",
              style: TextStyle(
                  color: Colors.greenAccent,
                  fontSize: 12,
                  fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

// ==========================================
// 10. ADMIN PANEL SCREEN
// ==========================================
class AdminPanelScreen extends StatelessWidget {
  const AdminPanelScreen({super.key});

  final List<Map<String, String>> _flaggedMessages = const [
    {
      "sender": "User_9082",
      "space": "System Architecture",
      "msg": "Check out my new crypto trading bot link in bio!",
      "reason": "Promotional / Spam Boundaries"
    },
    {
      "sender": "Guest_441",
      "space": "Frontend Dev",
      "msg": "The elections this year are an absolute mess.",
      "reason": "Political Discussions"
    },
  ];

  @override
  Widget build(BuildContext context) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    List<Map<String, String>> dynamicFlags = List.from(_flaggedMessages);
    dynamicFlags.insert(1, {
      "sender": globalUsername,
      "space": "Study Group Alpha",
      "msg": "Did anyone see the new superhero movie yesterday?",
      "reason": "Entertainment boundaries in Study Space"
    });

    return Scaffold(
      appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text("Admin Moderation Panel",
              style: TextStyle(
                  fontSize: 16, color: isDark ? Colors.white : Colors.black))),
      body: DarkVeilBackground(
        isLight: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Intercepted Messages",
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black)),
                  const SizedBox(height: 8),
                  Text(
                      "Messages blocked by the AI Moderator before reaching the community.",
                      style: TextStyle(
                          color: isDark ? Colors.white70 : Colors.black87)),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: dynamicFlags.length,
                itemBuilder: (context, index) {
                  final flag = dynamicFlags[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 15.0, sigmaY: 15.0),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.redAccent.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                                color: Colors.redAccent.withOpacity(0.5),
                                width: 1.5),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text("Sender: ${flag['sender']}",
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: isDark
                                              ? Colors.white
                                              : Colors.black)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                        color:
                                            Colors.redAccent.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(8)),
                                    child: const Text("BLOCKED",
                                        style: TextStyle(
                                            color: Colors.redAccent,
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold)),
                                  )
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text("Attempted in: ${flag['space']}",
                                  style: TextStyle(
                                      color: isDark
                                          ? Colors.white70
                                          : Colors.black54,
                                      fontSize: 12)),
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12.0),
                                child: Divider(
                                    color: isDark
                                        ? Colors.white24
                                        : Colors.black12,
                                    height: 1),
                              ),
                              Text('"${flag['msg']}"',
                                  style: TextStyle(
                                      color:
                                          isDark ? Colors.white : Colors.black,
                                      fontStyle: FontStyle.italic)),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Icon(Icons.security,
                                      color:
                                          Theme.of(context).colorScheme.primary,
                                      size: 14),
                                  const SizedBox(width: 8),
                                  Expanded(
                                      child: Text(
                                          "Violation: ${flag['reason']}",
                                          style: TextStyle(
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .primary,
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold))),
                                ],
                              )
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
